import {
    MplInscription,
    allocate,
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
import {
    fetchDigitalAsset,
    findMetadataPda, mplTokenMetadata
} from '@metaplex-foundation/mpl-token-metadata';
import { Pda, PublicKey, Umi, keypairIdentity } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { readFileSync } from 'fs';
import pMap from 'p-map';

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
    .option('-c --concurrency <number>', 'Number of concurrent writes to perform', 2)
    .action(async (str: any, options: any) => {
        const { rpc, keypair, mint, concurrency } = options.opts();

        let numThreads = parseInt(concurrency);

        let umi = createUmi(rpc);
        umi = loadWalletKey(umi, keypair);
        umi.use(MplInscription());
        umi.use(mplTokenMetadata());

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
        const tokenMetadataAccount = findMetadataPda(umi, {
            mint: nft.mint.publicKey
        });
        const inscriptionShardAccount = await fetchIdempotentInscriptionShard(umi);

        if (!await accountExists(umi, mintInscriptionAccount[0])) {
            await initializeFromMint(umi, {
                mintInscriptionAccount,
                inscriptionMetadataAccount,
                mintAccount: nft.mint.publicKey,
                tokenMetadataAccount,
                inscriptionShardAccount
            }).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });
        }

        const associatedInscriptionAccount = findAssociatedInscriptionPda(umi, {
            associated_tag: 'image',
            inscriptionMetadataAccount,
        });

        if (!await accountExists(umi, associatedInscriptionAccount[0])) {
            await initializeAssociatedInscription(umi, {
                inscriptionMetadataAccount,
                associatedInscriptionAccount,
                associationTag: 'image'
            }).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });
        }

        if (!await accountValid(umi, mintInscriptionAccount[0], jsonBytes)) {
            console.log('Inscribing JSON...');
            await inscribe(umi, jsonBytes, mintInscriptionAccount, inscriptionMetadataAccount, null, numThreads);
        } else {
            console.log('JSON already inscribed.');
        }

        if (!await accountValid(umi, associatedInscriptionAccount[0], mediaBytes)) {
            console.log('Inscribing image...');
            await inscribe(umi, mediaBytes, associatedInscriptionAccount, inscriptionMetadataAccount, 'image', numThreads);
        } else {
            console.log('Image already inscribed.');
        }
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

async function inscribe(umi: Umi, bytes: Buffer, inscriptionAccount: Pda, inscriptionMetadataAccount: PublicKey | Pda, tag: string | null, concurrency: number) {
    const chunks = retrieveChunks(bytes, 500);
    let numAllocs = Math.floor((bytes.length - await accountLength(umi, inscriptionAccount[0])) / 10240);
    let associatedTag = null;
    if (tag) {
        associatedTag = tag;
    }

    while (numAllocs > 0) {
        console.log(`Allocating ${numAllocs} more chunks...`);
        await pMap(Array(numAllocs).fill(0), async () => {
            try {
                await allocate(umi, {
                    inscriptionAccount,
                    inscriptionMetadataAccount,
                    associatedTag,
                    targetSize: bytes.length,
                }).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });
            } catch (e) {
                console.log(e);
            }
        }, { concurrency });

        numAllocs = Math.floor((bytes.length - await accountLength(umi, inscriptionAccount[0])) / 10240);
    }

    await pMap(chunks, async (chunk, i) => {
        try {
            console.log(`Writing chunk ${i} of ${chunks.length}...`);
            await writeData(umi, {
                inscriptionAccount,
                inscriptionMetadataAccount,
                associatedTag,
                value: chunk,
                offset: i * 500,
            }).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });
        } catch (e) {
            console.log(e);
        }
    }, { concurrency });
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
        }).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

        // Then an account was created with the correct data.
        shardData = await safeFetchInscriptionShard(umi, shardAccount);
    }

    return shardAccount;
}

async function accountExists(umi: Umi, account: PublicKey) {
    const maybeAccount = await umi.rpc.getAccount(account);
    if (maybeAccount.exists) {
        return true;
    }
    return false;
}

async function accountValid(umi: Umi, account: PublicKey, expectedData: Buffer) {
    const accountInfo = await umi.rpc.getAccount(account);
    if (!accountInfo.exists || accountInfo.data.length !== expectedData.length) {
        return false;
    }
    else {
        return Buffer.from(accountInfo.data).equals(expectedData);
    }
}

async function accountLength(umi: Umi, account: PublicKey) {
    const accountInfo = await umi.rpc.getAccount(account);
    if (!accountInfo.exists) {
        throw new Error('Account does not exist!');
    }
    return accountInfo.data.length;
}