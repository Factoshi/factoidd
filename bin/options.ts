import { join } from 'path';
import commander from 'commander';
import dotenv from 'dotenv';
var pjson = require('../package.json');

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
    .name(pjson.name)
    .version(pjson.version)
    .option('-l, --loglvl <level>', 'log output level', process.env.LOG_LEVEL || 'info')
    .option(
        '--db <database>',
        'path to database directory',
        process.env.DB_PATH || join(__dirname, '..', 'database')
    )
    .option(
        '-c, --config <config>',
        'path to config directory',
        process.env.CONFIG_PATH || join(__dirname, '..', 'config')
    );

export { program };
