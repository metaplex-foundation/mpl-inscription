import { fetchInscriptionMetadataFromSeeds, fetchInscriptionShardFromSeeds, findMintInscriptionPda, mplInscription } from "@metaplex-foundation/mpl-inscription";
import { PublicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { writeFileSync } from "fs";
import pMap from "p-map";

export async function fetchShard(rpc: string, shards: number[], concurrency: number, output: string) {
    const umi = createUmi(rpc);
    umi.use(mplInscription());

    const shardAccounts = await pMap(shards, async (shard) => {
        let shardAccount = await fetchInscriptionShardFromSeeds(umi, {
            shardNumber: shard
        });

        delete shardAccount["header"];

        shardAccount["realCount"] = Number(shardAccount.count) * 32 + shardAccount.shardNumber;

        return shardAccount;
    }, { concurrency });

    writeFileSync(output, JSON.stringify([...shardAccounts], (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value,
        2));
}