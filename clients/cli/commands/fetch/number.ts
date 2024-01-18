import { Key, getInscriptionMetadataGpaBuilder, mplInscription } from "@metaplex-foundation/mpl-inscription";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { writeFileSync } from "fs";
import pMap from "p-map";

export async function fetchInscriptionsByRank(rpc: string, ranks: number[], concurrency: number, output: string) {
    const umi = createUmi(rpc);
    umi.use(mplInscription());

    const inscriptionMetadataAccounts = await pMap(ranks, async (rank) => {
        const inscriptionMetadatas = [
            ...(await getInscriptionMetadataGpaBuilder(umi)
                .whereField("key", Key.MintInscriptionMetadataAccount)
                .whereField("inscriptionRank", rank)
                .getDeserialized()),
            ...(await getInscriptionMetadataGpaBuilder(umi)
                .whereField("key", Key.InscriptionMetadataAccount)
                .whereField("inscriptionRank", rank)
                .getDeserialized())
        ]

        // console.log(inscriptionMetadatas);

        if (inscriptionMetadatas.length === 0) {
            throw new Error(`No inscription metadata found for rank ${rank}`);
        } else if (inscriptionMetadatas.length > 1) {
            throw new Error(`Multiple inscription metadata found for rank ${rank}. This should never happen!`);
        }

        const inscriptionMetadata = inscriptionMetadatas[0];

        delete inscriptionMetadata["header"];
        delete inscriptionMetadata["padding"];
        return inscriptionMetadata;
    }, { concurrency });

    inscriptionMetadataAccounts.sort((a, b) => {
        if (a.inscriptionRank < b.inscriptionRank) {
            return -1;
        }
        if (a.inscriptionRank > b.inscriptionRank) {
            return 1;
        }
        return 0;
    });

    writeFileSync(output, JSON.stringify([...inscriptionMetadataAccounts], (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value,
        2));
}