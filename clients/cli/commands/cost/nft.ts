import { fetchDigitalAsset, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { PublicKey } from "@metaplex-foundation/umi";
import pMap from "p-map";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { SingleBar, Presets } from "cli-progress";
import { fileTypeFromBuffer } from "file-type";
import { globSync } from "glob";
import { getInitCost, getInscribeJsonCost, getInscribeMediaCost } from "../../utils.js";

export async function cost_nfts(mints: PublicKey[]) {
    // Create the cache folder if it doesn't already exist.
    if (!existsSync('./cache')) {
        mkdirSync('./cache');
    }

    console.log(`Estimating cost for ${mints.length} JSON files...`);
    let fetchJsonBar = new SingleBar({}, Presets.shades_classic)
    fetchJsonBar.start(mints.length, 0);
    const jsonBytes = await pMap(mints, async (mint, _i) => {
        if (existsSync(`./cache/${mint}.json`)) {
            fetchJsonBar.increment();
            return readFileSync(`./cache/${mint}.json`);
        }
    }, { concurrency: 1 });
    fetchJsonBar.stop();

    let totalSize = jsonBytes.reduce((a, b) => a + b.length, 0);
    let totalCost = jsonBytes.reduce((a, b) => a + getInscribeJsonCost(b.length), getInitCost() * mints.length);

    console.log(`Estimating cost for ${mints.length} Media files...`);
    let fetchMediaBar = new SingleBar({}, Presets.shades_classic)
    fetchMediaBar.start(mints.length, 0);
    const mediaBytes = await pMap(mints, async (mint, i) => {
        const mediaFiles = globSync(`cache/${mint}.*`, { ignore: ['cache/*.json', 'cache/*.metadata'] });
        const media = readFileSync(mediaFiles[0]);
        fetchMediaBar.increment();
        return media;
    }, { concurrency: 1 });
    fetchMediaBar.stop();

    totalSize = mediaBytes.reduce((a, b) => a + b.length, totalSize);
    totalCost = mediaBytes.reduce((a, b) => a + getInscribeMediaCost(b.length), totalCost);
    console.log(`Total Inscription cost for ${mints.length} NFTs and ${totalSize} bytes is ${totalCost} SOL.`);
}