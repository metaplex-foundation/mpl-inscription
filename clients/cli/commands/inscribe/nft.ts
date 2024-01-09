import { fetchDigitalAsset, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { accountExists, accountValid, inscribe, loadWalletKey } from "../../utils";
import { MplInscription, findAssociatedInscriptionPda, findInscriptionMetadataPda, findMintInscriptionPda, initializeAssociatedInscription, initializeFromMint } from "@metaplex-foundation/mpl-inscription";

const INSCRIPTION_GATEWAY: string = 'https://igw.metaplex.com/';

export async function inscribe_nft(_str: any, options: any) {
    const { rpc, keypair, mint, concurrency } = options.opts();

    let numThreads = parseInt(concurrency);

    let umi = createUmi(rpc);
    umi = loadWalletKey(umi, keypair);
    umi.use(MplInscription());
    umi.use(mplTokenMetadata());

    const network = umi.rpc.getCluster().toString().replace('-beta', '');

    const nft = await fetchDigitalAsset(umi, mint);
    if (nft.metadata.updateAuthority !== umi.identity.publicKey) {
        throw new Error('You are not the owner of this NFT!');
    }

    const jsonBytes = Buffer.from(await (await fetch(nft.metadata.uri)).arrayBuffer());
    console.log(`JSON Bytes are ${jsonBytes.length} bytes long.`);
    const jsonData = JSON.parse(jsonBytes.toString());
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
        throw new Error('No media found!');
    }

    const mediaBytes = Buffer.from(await (await fetch(imageURI)).arrayBuffer());
    console.log(`Media Bytes are ${mediaBytes.length} bytes long.`);
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

    const associatedInscriptionAccount = findAssociatedInscriptionPda(umi, {
        associated_tag: 'image',
        inscriptionMetadataAccount,
    });

    if (!await accountExists(umi, associatedInscriptionAccount[0])) {
        await initializeAssociatedInscription(umi, {
            inscriptionMetadataAccount,
            // associatedInscriptionAccount,
            associationTag: 'image'
        }).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });
    }

    if (!await accountValid(umi, mintInscriptionAccount[0], jsonBytes)) {
        console.log('Inscribing JSON...');
        await inscribe(umi, jsonBytes, mintInscriptionAccount, inscriptionMetadataAccount, null, numThreads);
    } else {
        console.log('JSON already inscribed.');
    }
    console.log(`JSON Inscription viewable at ${INSCRIPTION_GATEWAY}${network}/${mintInscriptionAccount[0].toString()}`);

    if (!await accountValid(umi, associatedInscriptionAccount[0], mediaBytes)) {
        console.log('Inscribing image...');
        await inscribe(umi, mediaBytes, associatedInscriptionAccount, inscriptionMetadataAccount, 'image', numThreads);
    } else {
        console.log('Image already inscribed.');
    }
    console.log(`Image Inscription viewable at ${INSCRIPTION_GATEWAY}${network}/${associatedInscriptionAccount[0].toString()}`);
}