import commander from 'commander';
import dotenv from 'dotenv';

import { init } from './init';
import { app } from './app';
var pjson = require('../../package.json');

// Load environment variables.
const envFile = process.env.ENV_FILE || 'develop';
const result = dotenv.config({
    path: `./env/${envFile}.env`,
});
if (result.error) {
    throw result.error;
}

const program = new commander.Command();

program
    // Set programme information
    .name(pjson.name)
    .version(pjson.version)
    // create main options
    .option('-l, --loglvl <level>', 'log output level', process.env.LOG_LEVEL || 'info')
    .action(({ loglvl }) => app(loglvl))
    // Create the `init` subcommand
    .command('init')
    .description('initialise factoidd config')
    .action(init);

// Get command line args
program.parse(process.argv);
