import { TokenStandard, createAndMint, createNft, fetchDigitalAsset, findMetadataPda, mplTokenMetadata, verifyCollectionV1 } from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner, percentAmount, publicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { nftStorageUploader } from "@metaplex-foundation/umi-uploader-nft-storage";
import { existsSync, readFileSync, readdirSync } from "fs";
import pMap from "p-map";
import { loadWalletKey } from "../../utils.js";
import { SingleBar, Presets } from "cli-progress";

export async function test_createCollection(rpc: string, keypair: string, assetsDir: string, concurrency: number) {
    let umi = createUmi(rpc);
    umi = loadWalletKey(umi, keypair);
    umi.use(mplTokenMetadata());
    umi.use(nftStorageUploader({ token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDRGRGRGMDk0Mjg3OWE3ZjQ0OTU0M2RERGUzRDdDY0E3N2Q0MzY1ZDYiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTcwNDkxNTc5NTQ3NSwibmFtZSI6Ikluc2NyaXB0aW9ucyJ9.iRNSAtmzOm8RKW8B-Ly0G99VTdQkNnh4pDEIxfnW5v0" }));

    // Create the cache folder if it doesn't already exist.
    if (!existsSync(assetsDir)) {
        throw new Error(`Assets directory ${assetsDir} does not exist.`);
    }

    // Create the collection NFT.
    const collectionMint = generateSigner(umi);
    await createAndMint(umi, {
        mint: collectionMint,
        name: 'My Collection',
        uri: 'https://example.com/my-collection.json',
        sellerFeeBasisPoints: percentAmount(5.5), // 5.5%
        isCollection: true,
        tokenStandard: TokenStandard.NonFungible,
    }).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

    // Fetch all the asset data.
    const assetFiles = readdirSync(assetsDir).filter(f => f.endsWith('.json'));

    // Create the assets.
    let assetBar = new SingleBar({}, Presets.shades_classic)
    assetBar.start(assetFiles.length, 0);
    await pMap(assetFiles, async (file) => {
        // console.log(file);
        const mint = publicKey(file.replace('.json', ''));
        const newMint = generateSigner(umi);
        // Fetch the original NFT data.
        const metadata = JSON.parse(readFileSync(`${assetsDir}/${mint}.metadata`).toString());
        await createAndMint(umi, {
            mint: newMint,
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            sellerFeeBasisPoints: percentAmount(5),
            tokenStandard: TokenStandard.NonFungible,
            collection: { key: collectionMint.publicKey, verified: false },
        })
            .append(
                verifyCollectionV1(umi, {
                    metadata: findMetadataPda(umi, { mint: newMint.publicKey }),
                    collectionMint: collectionMint.publicKey,
                })
            )
            .sendAndConfirm(umi);
        assetBar.increment();
    }, { concurrency });
    assetBar.stop();
}