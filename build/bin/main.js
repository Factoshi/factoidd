"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const dotenv_1 = __importDefault(require("dotenv"));
const init_1 = require("./init");
const app_1 = require("./app");
var pjson = require('../../package.json');
// Load environment variables.
const envFile = process.env.ENV_FILE || 'develop';
const result = dotenv_1.default.config({
    path: `./env/${envFile}.env`,
});
if (result.error) {
    throw result.error;
}
const program = new commander_1.default.Command();
program
    // Set programme information
    .name(pjson.name)
    .version(pjson.version)
    // create main options
    .option('-l, --loglvl <level>', 'log output level', process.env.LOG_LEVEL || 'info')
    .action(({ loglvl }) => app_1.app(loglvl))
    // Create the `init` subcommand
    .command('init')
    .description('initialise factoidd config')
    .action(init_1.init);
// Get command line args
program.parse(process.argv);
