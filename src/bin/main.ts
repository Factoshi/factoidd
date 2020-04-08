import commander from 'commander';
import dotenv from 'dotenv';

import { init } from './init';
import { app } from './start';
var pjson = require('../../package.json');

// Load environment variables.
const envFile = process.env.ENV_FILE || 'develop';
const result = dotenv.config({
    path: `./env/${envFile}.env`,
});
if (result.error) {
    console.log('No env file.');
}

const program = new commander.Command();

program
    // Set programme information
    .name(pjson.name)
    .version(pjson.version);

program
    .command('start')
    .description('start daemon to listen and record income transactions.')
    .option('-l, --loglvl <level>', 'log output level', process.env.LOG_LEVEL || 'info')
    .action(({ loglvl }) => app(loglvl));

// spend subcommand creates a spend transaction that is added to bitcoin.tax
// program
//     .command('spend')
//     .description('record a spend transaction')
//     .requiredOption(
//         '--from <address>',
//         'FCT address sending transaction. Can be public or private (required).'
//     )
//     .requiredOption(
//         '--to <address>',
//         'FCT address receiving transaction. Must be public FCT or EC address (required).'
//     )
//     .requiredOption('--amount <amount>', 'amount of FCT spent (required).')
//     .option(
//         '--send',
//         'broadcasts the transaction to the Factom network. If --from is public, address must be stored in walletd.',
//         false
//     );

// init subcommand initialises config
program.command('init').description('initialise factoidd config').action(init);

// Get command line args
program.parse(process.argv);
