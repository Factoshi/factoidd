import inquirer from 'inquirer';
import { isValidPublicFctAddress } from 'factom';
import yaml from 'js-yaml';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { FactomdConfig, AddressConfig, OptionsConfig } from '../lib';

enum FactomdLocation {
    OpenNode = 'OpenNode',
    DefaultLocal = 'Default localhost',
    OwnParam = 'Input own parameters',
}

async function createFactomdConfig(): Promise<FactomdConfig> {
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
                if (answer === 'http' || answer === 'https') {
                    return true;
                } else {
                    throw new Error('Response must be either "http" or "https"');
                }
            },
        },
    ];

    const answers: { factomd: FactomdConfig } = await inquirer.prompt(questions);
    return { ...answers.factomd };
}

async function createAddressConfig(addresses: AddressConfig[] = []): Promise<AddressConfig[]> {
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

async function createOptionsConfig(): Promise<OptionsConfig> {
    const questions = [
        {
            type: 'input',
            name: 'cryptocompare',
            message:
                'Enter you cryptocompare API key (https://www.cryptocompare.com/cryptopian/api-keys):',
            validate: (key: string) => {
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
            when: (answers: any) => answers.bitcoinTax,
            validate: (key: string) => {
                return /^[A-Fa-f0-9]{16}$/.test(key)
                    ? true
                    : new Error('Expected 16 char hex key.');
            },
        },
        {
            type: 'input',
            name: 'bitcoinTaxSecret',
            message: `Enter your bitcoin.tax secret: `,
            when: (answers: any) => answers.bitcoinTax,
            validate: (key: string) => {
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
            validate: (height: number) => {
                return height > 0 ? true : new Error('Height cannot be negative.');
            },
        },
    ];

    const answers = await inquirer.prompt(questions);
    return answers;
}

/**
 * Gets the absolute path to the app directory.
 */
function getAppdirPath() {
    const homedir = os.homedir();
    return path.join(homedir, '.factoidd');
}

/**
 * Gets the absolute path to the config file.
 */
export function getConfigPath(appdir?: string) {
    if (!appdir) {
        appdir = getAppdirPath();
    }
    return path.join(appdir, 'config.yaml');
}

/**
 * Gets the absolute path to the database file.
 */
export function getDatabasePath(appdir?: string) {
    if (!appdir) {
        appdir = getAppdirPath();
    }
    return path.join(appdir, 'factoidd.db');
}

/**
 * Writes config string to yaml file in app directory.
 * @param appdir Absolute path to app directory.
 * @param config Config as yaml string.
 */
function writeConfig({ appdir, config }: { appdir: string; config: string }) {
    const configPath = getConfigPath(appdir);
    console.warn(`Writing config to ${configPath}`);
    fs.writeFileSync(configPath, config);
}

/**
 * Creates an app directory in the home directory if it does not already exist.
 * @returns Absolute path to app directory
 */
function createAppdirIfNotExist(): string {
    const appdir = getAppdirPath();
    const appdirExists = fs.existsSync(appdir);
    if (!appdirExists) {
        console.log(`Creating app directory at: ${appdir}`);
        fs.mkdirSync(appdir);
    }
    return appdir;
}

export async function init() {
    // Build the config.
    const factomd = await createFactomdConfig();
    const addresses = await createAddressConfig();
    const options = await createOptionsConfig();
    const config = { factomd, addresses, options };
    const yamlConfig = yaml.safeDump(config);
    console.log(`${yamlConfig}`);

    // Create the app directory.
    const appdir = createAppdirIfNotExist();

    // Write config to config file.
    writeConfig({ appdir, config: yamlConfig });

    console.log('Done!');
}
