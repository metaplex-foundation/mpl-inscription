import { fetchDigitalAsset, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { PublicKey } from "@metaplex-foundation/umi";
import pMap from "p-map";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { SingleBar, Presets } from "cli-progress";
import { fileTypeFromBuffer } from "file-type";

export async function download_nfts(rpc: string, keypair: string, mints: PublicKey[], concurrency: number) {
    let umi = createUmi(rpc);
    umi.use(mplTokenMetadata());

    // Create the cache folder if it doesn't already exist.
    if (!existsSync('./cache')) {
        mkdirSync('./cache');
    }

    // Prune out any mints that have already been downloaded.
    mints = mints.filter((mint) => {
        return !existsSync(`./cache/${mint.toString()}.json`) || !existsSync(`./cache/${mint.toString()}.png`);
    });

    console.log(`Fetching ${mints.length} NFTs...`);
    let fetchNftBar = new SingleBar({}, Presets.shades_classic)
    fetchNftBar.start(mints.length, 0);
    const nfts = await pMap(mints, async (mint, _i) => {
        const nft = await fetchDigitalAsset(umi, mint);
        fetchNftBar.increment();
        return nft;
    }, { concurrency });
    fetchNftBar.stop();

    console.log(`Fetching ${nfts.length} JSON files...`);
    let fetchJsonBar = new SingleBar({}, Presets.shades_classic)
    fetchJsonBar.start(nfts.length, 0);
    const jsonBytes = await pMap(nfts, async (nft, _i) => {
        if (existsSync(`./cache/${nft.metadata.mint}.json`)) {
            fetchJsonBar.increment();
            return readFileSync(`./cache/${nft.metadata.mint}.json`);
        }
        
        let retries = 5;
        while (retries > 0) {
            try {
                const json = Buffer.from(await (await fetch(nft.metadata.uri)).arrayBuffer());
                const jsonFile = `./cache/${nft.metadata.mint}.json`;
                writeFileSync(jsonFile, json);
                fetchJsonBar.increment();
                return json;
            } catch (e) {
                console.log(`\n${e}\n`);
                retries--;
            }
        }
    }, { concurrency });
    fetchJsonBar.stop();

    const totalJsonBytes = jsonBytes.reduce((a, b) => a + b.length, 0);
    console.log(`${jsonBytes.length} JSON files are a total of ${totalJsonBytes} bytes.`);
    const jsonDatas = jsonBytes.map((bytes) => JSON.parse(bytes.toString()));

    console.log(`Fetching ${nfts.length} media files...`);
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

    let fetchMediaBar = new SingleBar({}, Presets.shades_classic)
    fetchMediaBar.start(imageURIs.length, 0);
    const mediaBytes = await pMap(imageURIs, async (imageURI, i) => {
        const media = Buffer.from(await (await fetch(imageURI)).arrayBuffer());
        const fileType = await fileTypeFromBuffer(media);
        if (!fileType) {
            throw new Error(`Could not determine file type for ${nfts[i]}!`);
        } else {
            const mediaFile = `./cache/${nfts[i].metadata.mint}.${fileType.ext}`;
            writeFileSync(mediaFile, media);
        }

        fetchMediaBar.increment();
        return media;
    }, { concurrency });
    fetchMediaBar.stop();

    const totalImageBytes = mediaBytes.reduce((a, b) => a + b.length, 0);
    console.log(`${mediaBytes.length} Image files are a total of ${totalImageBytes} bytes.`);
}