import commander from 'commander';
import { init } from './init';
import { start } from './start';
import { getDefaultAppdirPath } from '../lib';
import { spend } from './spend';
var pjson = require('../../package.json');

const program = new commander.Command();

program
    // Set programme information
    .name(pjson.name)
    .version(pjson.version);

program
    .command('start')
    .description('start daemon to listen and record income transactions.')
    .option('-l, --loglvl <level>', 'log output level', process.env.LOG_LEVEL || 'info')
    .option(
        '-d --appdir <directory>',
        'path to application directory',
        process.env.APP_DIR || getDefaultAppdirPath()
    )
    .action(({ loglvl, appdir }) => start(loglvl, appdir));

// spend subcommand creates a spend transaction that is added to bitcoin.tax
program
    .command('spend')
    .description('record a spend transaction')
    .requiredOption(
        '--txid <transaction ID>',
        'FCT address sending transaction. Can be public or private (required).'
    )
    .option(
        '-d --appdir <directory>',
        'path to application directory',
        process.env.APP_DIR || getDefaultAppdirPath()
    )
    .action(({ txid, appdir }) => spend(txid, appdir));

// init subcommand initialises config
program
    .command('init')
    .description('initialise factoidd config')
    .option(
        '-d --appdir <directory>',
        'path to application directory',
        process.env.APP_DIR || getDefaultAppdirPath()
    )
    .action(({ appdir }) => init(appdir));

// Get command line args
program.parse(process.argv);
