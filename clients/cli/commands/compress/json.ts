import pMap from "p-map";
import { glob } from "glob";
import { readFileSync, writeFileSync } from "fs";

export async function compress_json(fields: string[], concurrency: number) {
    // Find all json files in the cache directory.
    const files = await glob('cache/*.json');
    // Parse every json file in the cache directory.
    await pMap(files, async (file) => {
        const json = JSON.parse(readFileSync(file, 'utf-8'));
        // Remove the specified fields from the json.
        fields.forEach((field) => {
            delete json[field];
        });
        // Write the json back to the file.
        writeFileSync(file, JSON.stringify(json));
    }, { concurrency });
}