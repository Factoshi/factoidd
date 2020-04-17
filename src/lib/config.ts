import inquirer from 'inquirer';
import { isValidPublicFctAddress } from 'factom';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { FactomdConfig, AddressConfig, OptionsConfig, IConfig } from '.';
import yaml from 'js-yaml';
import { logger } from '.';

import { APP_DIR, CONFIG_FILENAME, DATABASE_FILENAME } from './constants';

/**
 * CREATE CONFIG
 */

/**
 * Gets the absolute path to the app directory.
 */
function getAppdirPath() {
    const homedir = os.homedir();
    return path.join(homedir, APP_DIR);
}

/**
 * Gets the absolute path to the config file.
 */
export function getDefaultConfigPath() {
    const appdir = getAppdirPath();
    return path.join(appdir, CONFIG_FILENAME);
}

/**
 * Gets the absolute path to the database file.
 */
export function getDefaultDatabasePath() {
    const appdir = getAppdirPath();
    return path.join(appdir, DATABASE_FILENAME);
}

/**
 * Creates an app directory in the home directory if it does not already exist.
 * @returns Absolute path to app directory
 */
export function createAppdirIfNotExist() {
    const appdir = getAppdirPath();
    const appdirExists = fs.existsSync(appdir);
    if (!appdirExists) {
        console.log(`Creating app directory at: ${appdir}`);
        fs.mkdirSync(appdir);
    }
    return appdir;
}

enum FactomdLocation {
    OpenNode = 'OpenNode',
    DefaultLocal = 'Default localhost',
    OwnParam = 'Input own parameters',
}

export async function createFactomdConfig(): Promise<FactomdConfig> {
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
            filter: (answer: FactomdLocation) => {
                if (answer === FactomdLocation.OpenNode) {
                    return {
                        host: 'api.factomd.net',
                        port: 443,
                        path: '/v2',
                        protocol: 'https',
                    };
                } else if (answer === FactomdLocation.DefaultLocal) {
                    return {
                        host: 'localhost',
                        port: 8088,
                        path: '/v2',
                        protocol: 'http',
                    };
                } else if (answer === FactomdLocation.OwnParam) {
                    return {};
                }
            },
        },
        {
            type: 'input',
            name: 'factomd.host',
            message: 'Where is your factomd node hosted?',
            default: 'localhost',
            when: (answers: any) => !answers.factomd.host,
        },
        {
            type: 'number',
            name: 'factomd.port',
            message: 'What port is your factomd API listening on?',
            default: 8088,
            when: (answers: any) => !answers.factomd.port,
        },
        {
            type: 'input',
            name: 'factomd.path',
            message: 'What is the path to the v2 API?',
            default: '/v2',
            when: (answers: any) => !answers.factomd.path,
        },
        {
            type: 'input',
            name: 'factomd.protocol',
            message: 'What protocol should be used to contact the factomd node? (http or https)',
            default: 'http',
            when: (answers: any) => !answers.factomd.protocol,
            validate: (answer: string) => {
                return (
                    answer === 'http' ||
                    answer === 'https' ||
                    new Error('Response must be either "http" or "https"')
                );
            },
        },
    ];

    const answers: { factomd: FactomdConfig } = await inquirer.prompt(questions);
    return { ...answers.factomd };
}

export async function createAddressConfig(
    addresses: AddressConfig[] = []
): Promise<AddressConfig[]> {
    const addressName = `Address ${addresses.length + 1}`;

    const questions = [
        {
            type: 'input',
            name: 'address',
            message: `${addressName}: Please input public FCT address:`,
            validate: (address: string) => {
                return isValidPublicFctAddress(address) || new Error('Invalid public FCT address');
            },
        },
        {
            type: 'input',
            name: 'currency',
            message: `${addressName}: What currency should be used for this address (e.g. USD, EUR, GBP)?`,
            filter: (answer: string) => answer.toUpperCase(),
            default: 'USD',
            validate: (answer: string) => {
                return answer.length === 3 || new Error('Currency symbol should be 3 characters.');
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

    const {
        newAddress,
        ...answers
    }: AddressConfig & { newAddress: string } = await inquirer.prompt(questions);

    if (newAddress) {
        return createAddressConfig([...addresses, answers]);
    } else {
        return [...addresses, answers];
    }
}

export async function createOptionsConfig(): Promise<OptionsConfig> {
    const questions = [
        {
            type: 'input',
            name: 'cryptocompare',
            message:
                'Enter you cryptocompare API key (https://www.cryptocompare.com/cryptopian/api-keys):',
            validate: (key: string) => {
                return /^[A-Fa-f0-9]{64}$/.test(key) || new Error('Expected 64 char hex key.');
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
            when: (answers: any) => answers.bitcoinTax,
            validate: (key: string) => {
                return /^[A-Fa-f0-9]{16}$/.test(key) || new Error('Expected 16 char hex key.');
            },
        },
        {
            type: 'input',
            name: 'bitcoinTaxSecret',
            message: `Enter your bitcoin.tax secret: `,
            when: (answers: any) => answers.bitcoinTax,
            validate: (key: string) => {
                return /^[A-Fa-f0-9]{32}$/.test(key) || new Error('Expected 32 char hex key.');
            },
        },
        {
            type: 'number',
            name: 'startHeight',
            message: `What block height do you wish to start from?`,
            default: 143400,
            validate: (height: number) => {
                return height > 0 ? true : new Error('Height cannot be negative.');
            },
        },
    ];

    const answers = await inquirer.prompt(questions);
    return answers;
}

/**
 * READ CONFIG
 */

const Joi = require('joi').extend(require('joi-factom'));

// Create joi schemas
const addressConfigSchema: AddressConfig = {
    address: Joi.factom().factoidAddress('public').required(),
    currency: Joi.string().alphanum().uppercase().length(3).required(),
    coinbase: Joi.boolean().required(),
    nonCoinbase: Joi.boolean().required(),
};

const factomdConfigSchema: FactomdConfig = {
    host: Joi.string().required(),
    port: Joi.number().port().required(),
    path: Joi.string().required(),
    protocol: Joi.string().required(),
};

const optionsSchema: OptionsConfig = {
    cryptocompare: Joi.string().alphanum().length(64).required(),
    bitcoinTax: Joi.boolean().required(),
    bitcoinTaxSecret: Joi.string().alphanum().length(32),
    bitcoinTaxKey: Joi.string().alphanum().length(16),
    startHeight: Joi.number().positive().default(143400),
};

const configSchema: Config = {
    factomd: Joi.object(factomdConfigSchema).default({
        host: 'api.factomd.net',
        port: 443,
        path: '/v2',
        protocol: 'https',
    }),
    addresses: Joi.array().has(addressConfigSchema).required(),
    options: Joi.object(optionsSchema).default({ startHeight: 143400, minTime: 100 }),
};

export class Config implements IConfig {
    public factomd: FactomdConfig;
    public addresses: AddressConfig[];
    public options: OptionsConfig;

    constructor(path: string) {
        logger.info(`Reading config from: ${path}`);

        try {
            const yamlString = fs.readFileSync(path, 'utf8');
            const config = yaml.safeLoad(yamlString);
            const { value, error } = Joi.validate(config, configSchema, { abortEarly: false });
            if (error instanceof Error) {
                throw error;
            }

            this.factomd = value.factomd;
            this.addresses = value.addresses;
            this.options = value.options;
        } catch (e) {
            logger.error('Unable to load config');
            logger.error(e.message);
            if (e.code === 'ENOENT') {
                logger.error('Did you init the config? See --help for more info.');
            }
            process.exit(1);
        }
    }
}
