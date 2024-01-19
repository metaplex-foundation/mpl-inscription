import { inscribe_nfts } from './commands/inscribe/nft.js';
import { create_shards } from './commands/create/shards.js';
import { PublicKey, publicKey } from '@metaplex-foundation/umi';
import { readFileSync } from 'fs';
import { download_nfts } from './commands/download/nft.js';

import { Command } from 'commander';
import { test_createCollection } from './commands/test/createCollection.js';
import { cost_nfts } from './commands/cost/nft.js';
import { compress_images } from './commands/compress/images.js';
import { compress_json } from './commands/compress/json.js';
import { fetchInscriptionsByMint } from './commands/fetch/nft.js';
import { fetchInscriptionsByRank } from './commands/fetch/number.js';

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
    .option('-c --concurrency <number>', 'Number of concurrent writes to perform', '10')
    .option('-sj --skip-json', 'Skip the JSON file creation', false)
    .option('-si --skip-images', 'Skip the image file creation', false)
    .action(async (str, options) => {
        const { rpc, keypair, mint, concurrency, skipJson, skipImages } = options.opts();
        await inscribe_nfts(rpc, keypair, [publicKey(mint)], parseInt(concurrency), skipJson, skipImages);
    });

inscribeCmd.command('hashlist')
    .description('Inscribe an existing NFT')
    .option('-r --rpc <string>', 'The endpoint to connect to.')
    .option('-k --keypair <string>', 'Solana wallet location')
    .option('-h --hashlist <string>', 'The file containing the hashlist')
    .option('-c --concurrency <number>', 'Number of concurrent writes to perform', '10')
    .option('-sj --skip-json', 'Skip the JSON file creation', false)
    .option('-si --skip-images', 'Skip the image file creation', false)
    .action(async (str, options) => {
        const { rpc, keypair, hashlist, concurrency, skipJson, skipImages } = options.opts();

        const hashlistArray = JSON.parse(readFileSync(hashlist, 'utf-8'));
        const mints: PublicKey[] = hashlistArray.map((mint: string) => publicKey(mint));

        await inscribe_nfts(rpc, keypair, mints, parseInt(concurrency), skipJson, skipImages);
    });

const downloadCmd = program.command('download');

downloadCmd.command('nft')
    .description('Download an existing NFT\'s data')
    .option('-r --rpc <string>', 'The endpoint to connect to.')
    .option('-k --keypair <string>', 'Solana wallet location')
    .option('-m --mint <string>', 'Mint address of the NFT')
    .option('-c --concurrency <number>', 'Number of concurrent writes to perform', '10')
    .action(async (str, options) => {
        const { rpc, keypair, mint, concurrency } = options.opts();

        await download_nfts(rpc, keypair, [publicKey(mint)], parseInt(concurrency));
    });

downloadCmd.command('hashlist')
    .description('Download an existing NFT\'s data')
    .option('-r --rpc <string>', 'The endpoint to connect to.')
    .option('-k --keypair <string>', 'Solana wallet location')
    .option('-h --hashlist <string>', 'The file containing the hashlist')
    .option('-c --concurrency <number>', 'Number of concurrent writes to perform', '10')
    .action(async (str, options) => {
        const { rpc, keypair, hashlist, concurrency } = options.opts();

        const hashlistArray = JSON.parse(readFileSync(hashlist, 'utf-8'));
        const mints: PublicKey[] = hashlistArray.map((mint: string) => publicKey(mint));

        await download_nfts(rpc, keypair, mints, parseInt(concurrency));
    });

const costCmd = program.command('cost');

costCmd.command('nft')
    .description('Calculate the cost of inscribing an NFT')
    .option('-m --mint <string>', 'Mint address of the NFT')
    .action(async (str, options) => {
        const { mint } = options.opts();

        await cost_nfts([publicKey(mint)]);
    });

costCmd.command('hashlist')
    .description('Calculate the cost of inscribing a hashlist')
    .option('-h --hashlist <string>', 'The file containing the hashlist')
    .action(async (str, options) => {
        const { hashlist } = options.opts();

        const hashlistArray = JSON.parse(readFileSync(hashlist, 'utf-8'));
        const mints: PublicKey[] = hashlistArray.map((mint: string) => publicKey(mint));

        await cost_nfts(mints);
    });

const compressCmd = program.command('compress');

compressCmd.command('images')
    .description('Compress images in the cache folder')
    .option('-q --quality <number>', 'The quality (%) of the compressed image', '80')
    .option('-s --size <number>', 'The resize (%) of the output image', '100')
    .option('-e --extension <string>', 'The extension of the output image', 'jpg')
    .option('-c --concurrency <number>', 'Number of concurrent writes to perform', '10')
    .action(async (str, options) => {
        const { quality, size, extension, concurrency } = options.opts();

        await compress_images(parseInt(quality), parseInt(size), extension, parseInt(concurrency));
    });

compressCmd.command('json')
    .description('Reduce size of the JSON files in the cache folder')
    .option('-r --remove [fields...]', 'Fields to remove from the JSON files', ['symbol', 'description', 'seller_fee_basis_points', 'collection'])
    .option('-c --concurrency <number>', 'Number of concurrent writes to perform', '10')
    .action(async (str, options) => {
        const { remove, concurrency } = options.opts();

        await compress_json(remove, parseInt(concurrency));
    });

const fetchCmd = program.command('fetch');

fetchCmd.command('nft')
    .description('Fetch an NFT\'s Inscription data')
    .option('-r --rpc <string>', 'The endpoint to connect to.')
    .option('-m --mint <string>', 'Mint address of the NFT')
    .option('-c --concurrency <number>', 'Number of concurrent writes to perform', '10')
    .option('o --output <string>', 'Output file', 'output.json')
    .action(async (str, options) => {
        const { rpc, mint, concurrency, output } = options.opts();

        await fetchInscriptionsByMint(rpc, [publicKey(mint)], parseInt(concurrency), output);
    });

fetchCmd.command('hashlist')
    .description('Fetch a Hashlist\'s Inscription data')
    .option('-r --rpc <string>', 'The endpoint to connect to.')
    .option('-h --hashlist <string>', 'The file containing the hashlist')
    .option('-c --concurrency <number>', 'Number of concurrent writes to perform', '10')
    .option('o --output <string>', 'Output file', 'output.json')
    .action(async (str, options) => {
        const { rpc, hashlist, concurrency, output } = options.opts();

        const hashlistArray = JSON.parse(readFileSync(hashlist, 'utf-8'));
        const mints: PublicKey[] = hashlistArray.map((mint: string) => publicKey(mint));

        await fetchInscriptionsByMint(rpc, mints, parseInt(concurrency), output);
    });

fetchCmd.command('rank')
    .description('Fetch Inscription data by rank')
    .option('-r --rpc <string>', 'The endpoint to connect to.')
    .option('-rn --rankNumbers <number...>', 'The rank to search for')
    .option('-c --concurrency <number>', 'Number of concurrent writes to perform', '10')
    .option('o --output <string>', 'Output file', 'output.json')
    .action(async (str, options) => {
        const { rpc, rankNumbers, concurrency, output } = options.opts();

        const ranks: number[] = rankNumbers.map((rank: string) => parseInt(rank));

        await fetchInscriptionsByRank(rpc, ranks, parseInt(concurrency), output);
    });

const createCmd = program.command('create');

createCmd.command('shards')
    .description('Inscribe an existing NFT')
    .option('-r --rpc <string>', 'The endpoint to connect to.')
    .option('-k --keypair <string>', 'Solana wallet location')
    .action(create_shards);

const testCmd = program.command('test');

testCmd.command('create_collection')
    .description('Create a test collection')
    .option('-r --rpc <string>', 'The endpoint to connect to.')
    .option('-k --keypair <string>', 'Solana wallet location')
    .option('-c --concurrency <number>', 'Number of concurrent writes to perform', '10')
    .action(async (str, options) => {
        const { rpc, keypair, concurrency } = options.opts();

        await test_createCollection(rpc, keypair, 'cache', parseInt(concurrency));
    });

program.parse(process.argv);