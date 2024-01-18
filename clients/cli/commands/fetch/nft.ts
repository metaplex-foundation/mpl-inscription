import { fetchInscriptionMetadataFromSeeds, findMintInscriptionPda, mplInscription } from "@metaplex-foundation/mpl-inscription";
import { PublicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { writeFileSync } from "fs";
import pMap from "p-map";

export async function fetchInscriptionsByMint(rpc: string, mints: PublicKey[], concurrency: number, output: string) {
    const umi = createUmi(rpc);
    umi.use(mplInscription());

    const inscriptionMetadataAccounts = await pMap(mints, async (mint) => {
        const mintInscription = findMintInscriptionPda(umi, { mint });
        const inscriptionMetadata = await fetchInscriptionMetadataFromSeeds(umi, { inscriptionAccount: mintInscription[0] });
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