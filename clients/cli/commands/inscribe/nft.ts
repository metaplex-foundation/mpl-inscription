import { fetchDigitalAsset, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { accountExists, accountValid, getInitCost, getInscribeJsonCost, getInscribeMediaCost, inscribe, loadWalletKey } from "../../utils.js";
import { mplInscription, findAssociatedInscriptionPda, findInscriptionMetadataPda, findMintInscriptionPda, initializeAssociatedInscription, initializeFromMint } from "@metaplex-foundation/mpl-inscription";
import { PublicKey } from "@metaplex-foundation/umi";
import pMap from "p-map";
import { exists, existsSync, readFileSync } from "fs";
import { globSync } from "glob";
import yesno from "yesno";

const INSCRIPTION_GATEWAY: string = 'https://igw.metaplex.com/';

export async function inscribe_nfts(rpc: string, keypair: string, mints: PublicKey[], concurrency: number) {
    let umi = createUmi(rpc);
    umi = loadWalletKey(umi, keypair);
    umi.use(mplInscription());
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
        const cacheFile = `cache/${nft.mint.publicKey.toString()}.json`;
        if (existsSync(cacheFile)) {
            return readFileSync(cacheFile);
        } else {
            return Buffer.from(await (await fetch(nft.metadata.uri)).arrayBuffer());
        }
    }, { concurrency });

    let totalCost = jsonBytes.reduce((a, b) => a + getInscribeJsonCost(b.length), getInitCost() * mints.length);
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

    const mediaBytes = await pMap(imageURIs, async (imageURI, i) => {
        const cacheFiles = globSync(`cache/${nfts[i].metadata.mint.toString()}.*`, {
            ignore: ['cache/*.json', 'cache/*.metadata']
        });
        if (cacheFiles.length > 0) {
            return readFileSync(cacheFiles[0]);
        } else {
            return Buffer.from(await (await fetch(imageURI)).arrayBuffer());
        }
    }, { concurrency });

    totalCost = mediaBytes.reduce((a, b) => a + getInscribeMediaCost(b.length), totalCost);
    const totalImageBytes = mediaBytes.reduce((a, b) => a + b.length, 0);
    console.log(`${mediaBytes.length} Image files are a total of ${totalImageBytes} bytes.`);

    const ok = await yesno({
        question: `Inscribing ${nfts.length} NFTs will cost ${totalCost} SOL. Do you want to continue (y/n)?`
    });

    if (!ok) {
        console.log("Aborting...");
        return;
    }

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
        const mintInscriptionAccount = findMintInscriptionPda(umi, {
            mint: nfts[i].mint.publicKey
        });
        const associatedInscriptionAccount = findAssociatedInscriptionPda(umi, {
            associated_tag: 'image',
            inscriptionMetadataAccount,
        });

        if (!await accountExists(umi, associatedInscriptionAccount[0])) {
            await initializeAssociatedInscription(umi, {
                inscriptionAccount: mintInscriptionAccount[0],
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