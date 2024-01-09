import { allocate, createShard, findInscriptionShardPda, safeFetchInscriptionShard, writeData } from "@metaplex-foundation/mpl-inscription";
import { Pda, PublicKey, Umi, keypairIdentity } from "@metaplex-foundation/umi";
import { readFileSync, write } from "fs";
import { SingleBar, Presets } from "cli-progress";
import pMap from "p-map";

export function loadWalletKey(umi: Umi, keypair: string): Umi {
    if (!keypair || keypair == '') {
        throw new Error('Keypair is required!');
    }
    const loaded = umi.eddsa.createKeypairFromSecretKey(
        new Uint8Array(JSON.parse(readFileSync(keypair).toString()))
    );
    return umi.use(keypairIdentity(loaded));
}

const CHUNK_SIZE: number = 500;

class Chunk {
    constructor(public offset: number, public data: Buffer) { }
}

export function retrieveChunks(bytes: Buffer, chunkSize: number): Chunk[] {
    const chunks: Chunk[] = [];
    let offset = 0;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        chunks.push(new Chunk(offset, chunk));
        offset++;
    }
    return chunks;
}

export async function inscribe(umi: Umi, bytes: Buffer, inscriptionAccount: Pda, inscriptionMetadataAccount: PublicKey | Pda, tag: string | null, concurrency: number) {
    // const chunks = retrieveChunks(bytes, CHUNK_SIZE);
    let accountSize = await accountLength(umi, inscriptionAccount[0]);
    console.log(`Account size: ${accountSize}`);
    console.log(`Bytes length: ${bytes.length}`);
    let numAllocs = Math.ceil((bytes.length - accountSize) / 10240);
    let associatedTag = null;
    if (tag) {
        associatedTag = tag;
    }

    if (numAllocs > 0) {
        console.log("Allocating Space...");
        const allocateBar = new SingleBar({}, Presets.shades_classic)
        allocateBar.start(bytes.length, accountSize);
        while (numAllocs > 0) {
            // console.log(`Allocating ${numAllocs + 1} more chunks...`);
            await pMap(Array(numAllocs).fill(0), async () => {
                try {
                    await allocate(umi, {
                        inscriptionAccount,
                        inscriptionMetadataAccount,
                        associatedTag,
                        targetSize: bytes.length,
                    }).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });
                    allocateBar.increment();
                } catch (e) {
                    console.log(`\n${e}\n`);
                }
            }, { concurrency });

            accountSize = await accountLength(umi, inscriptionAccount[0]);
            allocateBar.update(accountSize);
            numAllocs = Math.ceil((bytes.length - accountSize) / 10240);
        }
        allocateBar.update(bytes.length);
        allocateBar.stop();
    }

    console.log("Inscribing Data...");
    const writeBar = new SingleBar({}, Presets.shades_classic)
    let chunksToWrite = await compareChunkSets(umi, inscriptionAccount[0], bytes);
    let totalChunkBytes = chunksToWrite.reduce((acc, chunk) => acc + chunk.data.length, 0);
    writeBar.start(bytes.length, bytes.length - totalChunkBytes);
    while (chunksToWrite.length > 0) {
        await pMap(chunksToWrite, async (chunk, _i) => {
            let success = false;
            while (!success) {
                try {
                    // console.log(`Writing chunk ${i + 1} of ${chunks.length}...`);
                    await writeData(umi, {
                        inscriptionAccount,
                        inscriptionMetadataAccount,
                        associatedTag,
                        value: chunk.data,
                        offset: chunk.offset * CHUNK_SIZE,
                    }).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' }});
                    success = true;
                    writeBar.increment(chunk.data.length);
                } catch (e) {
                    console.log(`\n${e}\n`);
                }
            }
        }, { concurrency });

        console.log("\nVerifying Inscription...");
        chunksToWrite = await compareChunkSets(umi, inscriptionAccount[0], bytes);

        if (chunksToWrite.length > 0) {
            console.log("Verification failed, retrying...");
        }
    }
    writeBar.stop();
}

export async function accountExists(umi: Umi, account: PublicKey) {
    const maybeAccount = await umi.rpc.getAccount(account);
    if (maybeAccount.exists) {
        return true;
    }
    return false;
}

export async function accountValid(umi: Umi, account: PublicKey, expectedData: Buffer) {
    const accountInfo = await umi.rpc.getAccount(account);
    if (!accountInfo.exists || accountInfo.data.length !== expectedData.length) {
        return false;
    }
    else {
        return Buffer.from(accountInfo.data).equals(expectedData);
    }
}

async function compareChunkSets(umi: Umi, account: PublicKey, expectedData: Buffer): Promise<Chunk[]> {
    const accountInfo = await umi.rpc.getAccount(account, { commitment: 'confirmed' });
    if (accountInfo.exists) {
        const chunks = retrieveChunks(expectedData, CHUNK_SIZE);
        const accountChunks = retrieveChunks(Buffer.from(accountInfo.data), CHUNK_SIZE);
        const diffChunks: Chunk[] = [];
        for (let i = 0; i < chunks.length; i++) {
            if (Buffer.compare(chunks[i].data, accountChunks[i].data) != 0) {
                diffChunks.push(chunks[i]);
            }
        }
        return diffChunks;
    }
}

export async function accountLength(umi: Umi, account: PublicKey) {
    const accountInfo = await umi.rpc.getAccount(account);
    if (!accountInfo.exists) {
        throw new Error('Account does not exist!');
    }
    return accountInfo.data.length;
}

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}