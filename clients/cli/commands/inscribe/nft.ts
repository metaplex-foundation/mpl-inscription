import { fetchDigitalAsset, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { accountExists, accountValid, inscribe, loadWalletKey } from "../../utils.js";
import { MplInscription, findAssociatedInscriptionPda, findInscriptionMetadataPda, findMintInscriptionPda, initializeAssociatedInscription, initializeFromMint } from "@metaplex-foundation/mpl-inscription";
import { PublicKey } from "@metaplex-foundation/umi";
import pMap from "p-map";

const INSCRIPTION_GATEWAY: string = 'https://igw.metaplex.com/';

export async function inscribe_nfts(rpc: string, keypair: string, mints: PublicKey[], concurrency: number) {
    let umi = createUmi(rpc);
    umi = loadWalletKey(umi, keypair);
    umi.use(MplInscription());
    umi.use(mplTokenMetadata());

    const network = umi.rpc.getCluster().toString().replace('-beta', '');

    const nfts = await pMap(mints, async (mint, _i) => {
        return await fetchDigitalAsset(umi, mint)
    }, { concurrency });

    nfts.forEach(nft => {
        if (nft.metadata.updateAuthority !== umi.identity.publicKey) {
            throw new Error('You are not the owner of this NFT!');
        }
    });

    const jsonBytes = await pMap(nfts, async (nft, _i) => {
        return Buffer.from(await (await fetch(nft.metadata.uri)).arrayBuffer());
    }, { concurrency });

    const totalJsonBytes = jsonBytes.reduce((a, b) => a + b.length, 0);
    console.log(`${jsonBytes.length} JSON files are a total of ${totalJsonBytes} bytes.`);
    const jsonDatas = jsonBytes.map((bytes) => JSON.parse(bytes.toString()));

    const imageURIs = jsonDatas.map((jsonData, i) => {
        let imageURI = '';
        if (jsonData.animation_url) {
            imageURI = jsonData.animation_url;
        } else if (jsonData.image) {
            imageURI = jsonData.image;
        } else {
            for (const file of jsonData.properties.files) {
                if (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/gif') {
                    imageURI = file.uri;
                    break;
                }
            }
        }

        if (imageURI === '') {
            throw new Error(`No media found for ${nfts[i].mint}!`);
        }

        return imageURI;
    });

    const mediaBytes = await pMap(imageURIs, async (imageURI, _i) => {
        return Buffer.from(await (await fetch(imageURI)).arrayBuffer());
    }, { concurrency });
    const totalImageBytes = mediaBytes.reduce((a, b) => a + b.length, 0);
    console.log(`${mediaBytes.length} Image files are a total of ${totalImageBytes} bytes.`);

    console.log(`Initializing ${jsonBytes.length} Inscription JSON Accounts...`);

    const inscriptionMetadataAccounts = await pMap(nfts, async (nft, i) => {
        const mintInscriptionAccount = findMintInscriptionPda(umi, {
            mint: nft.mint.publicKey
        });
        const inscriptionMetadataAccount = findInscriptionMetadataPda(umi, {
            inscriptionAccount: mintInscriptionAccount[0]
        });

        if (!await accountExists(umi, mintInscriptionAccount[0])) {
            await initializeFromMint(umi, {
                mintAccount: nft.mint.publicKey,
            }).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });
        }

        return inscriptionMetadataAccount;
    }, { concurrency });

    console.log(`Initializing ${mediaBytes.length} Inscription Image Accounts...`);

    const associatedInscriptionAccounts = await pMap(inscriptionMetadataAccounts, async (inscriptionMetadataAccount, i) => {
        const associatedInscriptionAccount = findAssociatedInscriptionPda(umi, {
            associated_tag: 'image',
            inscriptionMetadataAccount,
        });

        if (!await accountExists(umi, associatedInscriptionAccount[0])) {
            await initializeAssociatedInscription(umi, {
                inscriptionMetadataAccount,
                associationTag: 'image'
            }).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });
        }

        return associatedInscriptionAccount;
    }, { concurrency });

    for (let i = 0; i < nfts.length; i += 1) {
        const mintInscriptionAccount = findMintInscriptionPda(umi, {
            mint: nfts[i].mint.publicKey
        });

        if (!await accountValid(umi, mintInscriptionAccount[0], jsonBytes[i])) {
            console.log('Inscribing JSON...');
            await inscribe(umi, jsonBytes[i], mintInscriptionAccount, inscriptionMetadataAccounts[i], null, concurrency);
        } else {
            console.log('JSON already inscribed.');
        }
        console.log(`JSON Inscription viewable at ${INSCRIPTION_GATEWAY}${network}/${mintInscriptionAccount[0].toString()}`);
    }

    for (let i = 0; i < nfts.length; i += 1) {
        if (!await accountValid(umi, associatedInscriptionAccounts[i][0], mediaBytes[i])) {
            console.log('Inscribing image...');
            await inscribe(umi, mediaBytes[i], associatedInscriptionAccounts[i], inscriptionMetadataAccounts[i], 'image', concurrency);
        } else {
            console.log('Image already inscribed.');
        }
        console.log(`Image Inscription viewable at ${INSCRIPTION_GATEWAY}${network}/${associatedInscriptionAccounts[i][0].toString()}`);
    }
}