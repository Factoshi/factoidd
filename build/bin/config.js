"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const inquirer_1 = __importDefault(require("inquirer"));
const factom_1 = require("factom");
const js_yaml_1 = __importDefault(require("js-yaml"));
const fs_1 = __importDefault(require("fs"));
const lib_1 = require("../lib");
/**
 * CREATE CONFIG
 */
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
exports.createFactomdConfig = createFactomdConfig;
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
exports.createAddressConfig = createAddressConfig;
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
exports.createOptionsConfig = createOptionsConfig;
/**
 * READ CONFIG
 */
const Joi = require('joi').extend(require('joi-factom'));
// Create joi schemas
const addressConfigSchema = {
    address: Joi.factom().factoidAddress('public').required(),
    currency: Joi.string().alphanum().uppercase().length(3).required(),
    coinbase: Joi.boolean().required(),
    nonCoinbase: Joi.boolean().required(),
};
const factomdConfigSchema = {
    host: Joi.string().required(),
    port: Joi.number().port().required(),
    path: Joi.string().required(),
    protocol: Joi.string().required(),
};
const optionsSchema = {
    cryptocompare: Joi.string().alphanum().length(64).required(),
    bitcoinTax: Joi.boolean(),
    bitcoinTaxSecret: Joi.string().alphanum().length(32),
    bitcoinTaxKey: Joi.string().alphanum().length(16),
    startHeight: Joi.number().positive().default(143400),
};
const configSchema = {
    factomd: Joi.object(factomdConfigSchema).default({
        host: 'api.factomd.net',
        port: 443,
        path: '/v2',
        protocol: 'https',
    }),
    addresses: Joi.array().has(addressConfigSchema).required(),
    options: Joi.object(optionsSchema).default({ startHeight: 143400, minTime: 100 }),
};
class Config {
    constructor(path) {
        lib_1.logger.info(`Reading config from: ${path}`);
        try {
            const yamlString = fs_1.default.readFileSync(path, 'utf8');
            const config = js_yaml_1.default.safeLoad(yamlString);
            const { value, error } = Joi.validate(config, configSchema, { abortEarly: false });
            if (error instanceof Error) {
                throw error;
            }
            this.factomd = value.factomd;
            this.addresses = value.addresses;
            this.options = value.options;
        }
        catch (e) {
            lib_1.logger.error('Unable to load config');
            lib_1.logger.error(e.message);
            if (e.code === 'ENOENT') {
                lib_1.logger.error('Did you init the config? See --help for more info.');
            }
            process.exit(1);
        }
    }
}
exports.Config = Config;
