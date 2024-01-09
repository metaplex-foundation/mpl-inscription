import { inscribe_nft } from './commands/inscribe/nft';
import { create_shards } from './commands/create/shards';

const { Command } = require('commander');

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
    .option('-c --concurrency <number>', 'Number of concurrent writes to perform', 10)
    .action(inscribe_nft);

const createCmd = program.command('create');

createCmd.command('shards')
    .description('Inscribe an existing NFT')
    .option('-r --rpc <string>', 'The endpoint to connect to.')
    .option('-k --keypair <string>', 'Solana wallet location')
    .action(create_shards);

program.parse(process.argv);
