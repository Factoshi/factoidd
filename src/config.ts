import fs from 'fs';
import path from 'path';

import yaml from 'js-yaml';
import { logger } from './logger';
import { CONFIG_DIR } from './constants';

// Config types
export interface FactomdConfig {
    host: string;
    port: number;
    path: string;
    protocol: string;
}

export interface AddressConfig {
    address: string;
    name: string;
    coinbase: boolean;
    nonCoinbase: boolean;
}

export interface OptionsConfig {
    currency: string;
    startHeight: number;
}

export interface KeyConfig {
    bitcoinTax: boolean;
    bitcoinTaxSecret: string;
    bitcoinTaxKey: string;
    cryptocompare: string;
}

export interface IConfig {
    factomd: FactomdConfig;
    addresses: AddressConfig[];
    options: OptionsConfig;
    keys: KeyConfig;
}

/**
 * READ CONFIG
 */

const Joi = require('joi').extend(require('joi-factom'));

// Create joi schemas
const addressConfigSchema: AddressConfig = {
    address: Joi.factom().factoidAddress('public').required(),
    name: Joi.string().required(),
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
    currency: Joi.string().alphanum().uppercase().length(3).required(),
    startHeight: Joi.number().positive().default(143400),
};

const keySchema: KeyConfig = {
    cryptocompare: Joi.string().alphanum().length(64).required(),
    bitcoinTax: Joi.boolean().required(),
    bitcoinTaxSecret: Joi.string().alphanum().length(32),
    bitcoinTaxKey: Joi.string().alphanum().length(16),
};

const configSchema: Config = {
    factomd: Joi.object(factomdConfigSchema).default({
        host: 'api.factomd.net',
        port: 443,
        path: '/v2',
        protocol: 'https',
    }),
    keys: Joi.object(keySchema),
    addresses: Joi.array().has(addressConfigSchema).required(),
    options: Joi.object(optionsSchema).default({ startHeight: 143400, minTime: 500 }),
};

export class Config implements IConfig {
    public factomd: FactomdConfig;
    public addresses: AddressConfig[];
    public options: OptionsConfig;
    public keys: KeyConfig;

    constructor() {
        const filepath = path.resolve(CONFIG_DIR, 'config.yml');
        logger.info(`Reading config from: ${filepath}`);

        try {
            const yamlString = fs.readFileSync(filepath, 'utf8');
            const config = yaml.safeLoad(yamlString);
            const { value, error } = Joi.validate(config, configSchema, { abortEarly: false });
            if (error instanceof Error) {
                throw error;
            }

            if (
                (value.keys.bitcoinTax && !value.keys.bitcoinTaxSecret) ||
                (value.keys.bitcoinTax && !value.keys.bitcoinTaxKey)
            ) {
                throw new Error('Must provide bitcoin.tax secret and key when bitoinTax true');
            }

            this.factomd = value.factomd;
            this.addresses = value.addresses;
            this.keys = value.keys;
            this.options = value.options;
        } catch (e) {
            logger.error('Unable to load config');
            logger.error(e.message);
            process.exit(1);
        }
    }
}
