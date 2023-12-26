import {
    MplInscription,
    createShard,
    findAssociatedInscriptionPda,
    findInscriptionMetadataPda,
    findInscriptionShardPda,
    findMintInscriptionPda,
    initializeAssociatedInscription,
    initializeFromMint,
    safeFetchInscriptionShard,
    writeData
} from '@metaplex-foundation/mpl-inscription';
import { fetchDigitalAsset,
    findMetadataPda, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { Keypair, Pda, PublicKey, Umi, keypairIdentity } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { readFileSync } from 'fs';

const { Command } = require('commander');

const program = new Command();

program
    .name('Metaplex Inscription CLI')
    .description('CLI to manage Inscriptions')
    .version('0.1.0');

const inscribeCmd = program.command('inscribe');

inscribeCmd.command('nft')
    .description('Inscribe an existing NFT')
    .option('-r --rpc <string>', 'The endpoint to connect to.')
    .option('-k --keypair <string>', 'Solana wallet location')
    .option('-m --mint <string>', 'Mint address of the NFT')
    .action(async (str: any, options: any) => {
        const { rpc, keypair, mint } = options.opts();

        let umi = createUmi(rpc);
        umi = loadWalletKey(umi, keypair);
        umi.use(MplInscription());
        umi.use(mplTokenMetadata());

        const nft = await fetchDigitalAsset(umi, mint);
        // console.log(nft);
        if (nft.metadata.updateAuthority !== umi.identity.publicKey) {
            throw new Error('You are not the owner of this NFT!');
        }

        const jsonBytes = Buffer.from(await (await fetch(nft.metadata.uri)).arrayBuffer());
        console.log(`JSON Bytes are ${jsonBytes.length} bytes long.`);
        // console.log(jsonBytes);
        const jsonData = JSON.parse(jsonBytes.toString());
        console.log(JSON.stringify(jsonData, null, 2));
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
        const tokenMetadataAccount = findMetadataPda(umi, {
            mint: nft.mint.publicKey
        });
        const inscriptionShardAccount = await fetchIdempotentInscriptionShard(umi);

        if (!accountExists(umi, mintInscriptionAccount[0])) {
            await initializeFromMint(umi, {
                mintInscriptionAccount,
                inscriptionMetadataAccount,
                mintAccount: nft.mint.publicKey,
                tokenMetadataAccount,
                inscriptionShardAccount
            }).sendAndConfirm(umi);
        }

        const associatedInscriptionAccount = findAssociatedInscriptionPda(umi, {
            associated_tag: 'image',
            inscriptionMetadataAccount,
        });

        if (!accountExists(umi, associatedInscriptionAccount[0])) {
            await initializeAssociatedInscription(umi, {
                inscriptionMetadataAccount,
                associatedInscriptionAccount,
                associationTag: 'image'
            }).sendAndConfirm(umi);
        }

        console.log('Inscribing JSON...');
        await inscribe(umi, jsonBytes, mintInscriptionAccount, inscriptionMetadataAccount, null);
        console.log('Inscribing image...');
        await inscribe(umi, mediaBytes, associatedInscriptionAccount, inscriptionMetadataAccount, 'image');
    });

program.parse(process.argv);

export function loadWalletKey(umi: Umi, keypair: string): Umi {
    if (!keypair || keypair == '') {
        throw new Error('Keypair is required!');
    }
    const loaded = umi.eddsa.createKeypairFromSecretKey(
        new Uint8Array(JSON.parse(readFileSync(keypair).toString()))
    );
    return umi.use(keypairIdentity(loaded));
}

function retrieveChunks(bytes: Buffer, chunkSize: number): Buffer[] {
    const chunks: Buffer[] = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        chunks.push(chunk);
    }
    return chunks;
}

async function inscribe(umi: Umi, bytes: Buffer, inscriptionAccount: PublicKey | Pda, inscriptionMetadataAccount: PublicKey | Pda, tag: string | null) {
    const chunks = retrieveChunks(bytes, 500);
    let associatedTag = null;
    if (tag) {
        associatedTag = tag;
    }
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        await writeData(umi, {
            inscriptionAccount,
            inscriptionMetadataAccount,
            associatedTag,
            value: chunk
        }).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });
    }
}

async function fetchIdempotentInscriptionShard(umi: Umi) {
    const shardNumber = Math.floor(Math.random() * 32);
    const shardAccount = findInscriptionShardPda(umi, { shardNumber });

    // Check if the account has already been created.
    let shardData = await safeFetchInscriptionShard(umi, shardAccount);

    if (!shardData) {
        await createShard(umi, {
            shardAccount,
            shardNumber,
        }).sendAndConfirm(umi);

        // Then an account was created with the correct data.
        shardData = await safeFetchInscriptionShard(umi, shardAccount);
    }

    return shardAccount;
}

async function accountExists(umi: Umi, account: PublicKey) {
    try {
        await umi.rpc.getAccount(account);
        return true;
    } catch (err) {
        return false;
    }
}

async function accountValid(umi: Umi, account: PublicKey, expectedData: Buffer) {
    const accountInfo = await umi.rpc.getAccount(account);
    if (!accountInfo.exists) {
        return false;
    } else {
        return Buffer.from(accountInfo.data).equals(expectedData);
    }
}