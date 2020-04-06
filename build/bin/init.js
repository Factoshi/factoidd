"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const inquirer_1 = __importDefault(require("inquirer"));
const factom_1 = require("factom");
const js_yaml_1 = __importDefault(require("js-yaml"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
var FactomdLocation;
(function (FactomdLocation) {
    FactomdLocation["OpenNode"] = "OpenNode";
    FactomdLocation["DefaultLocal"] = "Default localhost";
    FactomdLocation["OwnParam"] = "Input own parameters";
})(FactomdLocation || (FactomdLocation = {}));
async function createFactomdConfig() {
    const questions = [
        {
            type: 'list',
            name: 'factomd',
            message: 'Which factomd node would you like to use?',
            choices: [
                FactomdLocation.OpenNode,
                FactomdLocation.DefaultLocal,
                FactomdLocation.OwnParam,
            ],
            filter: (answer) => {
                if (answer === FactomdLocation.OpenNode) {
                    return {
                        host: 'api.factomd.net',
                        port: 443,
                        path: '/v2',
                        protocol: 'https',
                    };
                }
                else if (answer === FactomdLocation.DefaultLocal) {
                    return {
                        host: 'localhost',
                        port: 8088,
                        path: '/v2',
                        protocol: 'http',
                    };
                }
                else if (answer === FactomdLocation.OwnParam) {
                    return {};
                }
            },
        },
        {
            type: 'input',
            name: 'factomd.host',
            message: 'Where is your factomd node hosted?',
            default: 'localhost',
            when: (answers) => !answers.factomd.host,
        },
        {
            type: 'number',
            name: 'factomd.port',
            message: 'What port is your factomd API listening on?',
            default: 8088,
            when: (answers) => !answers.factomd.port,
        },
        {
            type: 'input',
            name: 'factomd.path',
            message: 'What is the path to the v2 API?',
            default: '/v2',
            when: (answers) => !answers.factomd.path,
        },
        {
            type: 'input',
            name: 'factomd.protocol',
            message: 'What protocol should be used to contact the factomd node? (http or https)',
            default: 'http',
            when: (answers) => !answers.factomd.protocol,
            validate: (answer) => {
                if (answer === 'http' || answer === 'https') {
                    return true;
                }
                else {
                    throw new Error('Response must be either "http" or "https"');
                }
            },
        },
    ];
    const answers = await inquirer_1.default.prompt(questions);
    return { ...answers.factomd };
}
async function createAddressConfig(addresses = []) {
    const addressName = `Address ${addresses.length + 1}`;
    const questions = [
        {
            type: 'input',
            name: 'address',
            message: `${addressName}: Please input public FCT address:`,
            validate: (address) => {
                return factom_1.isValidPublicFctAddress(address) || new Error('Invalid public FCT address');
            },
        },
        {
            type: 'input',
            name: 'currency',
            message: `${addressName}: What currency should be used for this address (e.g. USD, EUR, GBP)?`,
            filter: (answer) => answer.toUpperCase(),
            default: 'USD',
            validate: (answer) => {
                return answer.length === 3
                    ? true
                    : new Error('Currency symbol should be 3 characters.');
            },
        },
        {
            type: 'confirm',
            name: 'coinbase',
            message: `${addressName}: Do you want to record coinbase transactions?`,
        },
        {
            type: 'confirm',
            name: 'nonCoinbase',
            message: `${addressName}: Do you want to record non-coinbase transactions?`,
        },
        {
            type: 'confirm',
            name: 'newAddress',
            message: `Do you want to input another address?`,
        },
    ];
    const { newAddress, ...answers } = await inquirer_1.default.prompt(questions);
    if (newAddress) {
        return createAddressConfig([...addresses, answers]);
    }
    else {
        return [...addresses, answers];
    }
}
async function createOptionsConfig() {
    const questions = [
        {
            type: 'input',
            name: 'cryptocompare',
            message: 'Enter you cryptocompare API key (https://www.cryptocompare.com/cryptopian/api-keys):',
            validate: (key) => {
                return /^[A-Fa-f0-9]{64}$/.test(key)
                    ? true
                    : new Error('Expected 64 char hex key.');
            },
        },
        {
            type: 'confirm',
            name: 'bitcoinTax',
            message: `Do you want to record transactions on bitcoin.tax (https://bitcoin.tax/)?`,
        },
        {
            type: 'input',
            name: 'bitcoinTaxKey',
            message: `Enter your bitcoin.tax key: `,
            when: (answers) => answers.bitcoinTax,
            validate: (key) => {
                return /^[A-Fa-f0-9]{16}$/.test(key)
                    ? true
                    : new Error('Expected 16 char hex key.');
            },
        },
        {
            type: 'input',
            name: 'bitcoinTaxSecret',
            message: `Enter your bitcoin.tax secret: `,
            when: (answers) => answers.bitcoinTax,
            validate: (key) => {
                return /^[A-Fa-f0-9]{32}$/.test(key)
                    ? true
                    : new Error('Expected 32 char hex key.');
            },
        },
        {
            type: 'number',
            name: 'startHeight',
            message: `What block height do you wish to start from?`,
            default: 143400,
            validate: (height) => {
                return height > 0 ? true : new Error('Height cannot be negative.');
            },
        },
    ];
    const answers = await inquirer_1.default.prompt(questions);
    return answers;
}
/**
 * Gets the absolute path to the app directory.
 */
function getAppdirPath() {
    const homedir = os_1.default.homedir();
    return path_1.default.join(homedir, '.factoidd');
}
/**
 * Gets the absolute path to the config file.
 */
function getConfigPath(appdir) {
    if (!appdir) {
        appdir = getAppdirPath();
    }
    return path_1.default.join(appdir, 'config.yaml');
}
exports.getConfigPath = getConfigPath;
/**
 * Gets the absolute path to the database file.
 */
function getDatabasePath(appdir) {
    if (!appdir) {
        appdir = getAppdirPath();
    }
    return path_1.default.join(appdir, 'factoidd.db');
}
exports.getDatabasePath = getDatabasePath;
/**
 * Writes config string to yaml file in app directory.
 * @param appdir Absolute path to app directory.
 * @param config Config as yaml string.
 */
function writeConfig({ appdir, config }) {
    const configPath = getConfigPath(appdir);
    console.warn(`Writing config to ${configPath}`);
    fs_1.default.writeFileSync(configPath, config);
}
/**
 * Creates an app directory in the home directory if it does not already exist.
 * @returns Absolute path to app directory
 */
function createAppdirIfNotExist() {
    const appdir = getAppdirPath();
    const appdirExists = fs_1.default.existsSync(appdir);
    if (!appdirExists) {
        console.log(`Creating app directory at: ${appdir}`);
        fs_1.default.mkdirSync(appdir);
    }
    return appdir;
}
async function init() {
    // Build the config.
    const factomd = await createFactomdConfig();
    const addresses = await createAddressConfig();
    const options = await createOptionsConfig();
    const config = { factomd, addresses, options };
    const yamlConfig = js_yaml_1.default.safeDump(config);
    console.log(`${yamlConfig}`);
    // Create the app directory.
    const appdir = createAppdirIfNotExist();
    // Write config to config file.
    writeConfig({ appdir, config: yamlConfig });
    console.log('Done!');
}
exports.init = init;
