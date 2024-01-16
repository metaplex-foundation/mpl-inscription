import Compressor from "compressorjs";
import { readFileSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { glob } from "glob";
import pMap from "p-map";
import { imageSize } from "image-size";
import sharp from "sharp";
import * as path from "path";

export async function compress_images(quality: number, size: number, extension: string, concurrency: number) {
    const mediaFiles = await glob(`./cache/*.{png,jpeg,jpg}`);
    // console.log(mediaFiles);

    await pMap(mediaFiles, async (filePath) => {
        const file = new Blob([readFileSync(filePath)]);
        const { width, height } = imageSize(new Uint8Array(await file.arrayBuffer()));
        let compressor = sharp(filePath)
            .resize(width * size / 100, height * size / 100);

        switch (extension) {
            case 'png':
                compressor = compressor.png();
                break;
            case 'jpg':
            case 'jpeg':
                compressor = compressor.jpeg({ quality });
                break;
        }

        const image = await compressor.toFile(filePath + '.' + 'small' + '.' + extension);

        // console.log(image);
        // writeFileSync(filePath, image);
    }, { concurrency });

    // Remove the original files and rename the compressed files.
    await pMap(mediaFiles, async (filePath) => {
        unlinkSync(filePath);
        const compressedFilePath = filePath + '.' + 'small' + '.' + extension;
        const newFilePath = "cache/" + path.basename(filePath, path.extname(filePath)) + '.' + extension;
        console.log(newFilePath);
        renameSync(compressedFilePath, newFilePath);
    }, { concurrency });
}