import yaml from 'js-yaml';
import fs from 'fs';
import { resolve } from 'path';
import { logger } from './logger';

export interface AddressConfig {
    address: string;
    currency: string;
    recordCoinbase?: boolean;
    recordNonCoinbase?: boolean;
}

export interface FactomdConfig {
    host: string;
    port: number;
    path: string;
    protocol: string;
    user?: string;
    password?: string;
}

export interface BitcoinTaxConfig {
    key: string;
    secret: string;
}

export interface CryptocompareConfig {
    secret: string;
}

export interface OptionsConfig {
    startHeight: number;
    minTime: number;
}

const Joi = require('joi').extend(require('joi-factom'));

// Create joi schemas
const addressConfigSchema: AddressConfig = {
    address: Joi.factom().factoidAddress('public').required(),
    currency: Joi.string().alphanum().uppercase().length(3).required(),
    recordCoinbase: Joi.boolean().required(),
    recordNonCoinbase: Joi.boolean().required(),
};

const factomdConfigSchema: FactomdConfig = {
    host: Joi.string().required(),
    port: Joi.number().port().required(),
    path: Joi.string().required(),
    protocol: Joi.string().required(),
    user: Joi.string(),
    password: Joi.string(),
};

const bitcoinTaxSchema: BitcoinTaxConfig = {
    key: Joi.string().alphanum().length(16),
    secret: Joi.string().alphanum().length(32),
};

const cryptocompareSchema: CryptocompareConfig = {
    secret: Joi.string().alphanum().length(64).required(),
};

const optionsSchema: OptionsConfig = {
    startHeight: Joi.number().positive().default(143400),
    minTime: Joi.number().default(100),
};

const configSchema: Config = {
    factomd: Joi.object(factomdConfigSchema).default({
        host: 'api.factomd.net',
        port: 443,
        path: '/v2',
        protocol: 'https',
    }),
    addresses: Joi.array().has(addressConfigSchema).required(),
    cryptocompare: Joi.object(cryptocompareSchema).required(),
    bitcoinTax: Joi.object(bitcoinTaxSchema).default({}),
    options: Joi.object(optionsSchema).default({ startHeight: 143400, minTime: 100 }),
};

export class Config {
    public static factomd: Partial<FactomdConfig>;
    public static addresses: AddressConfig[];
    public static bitcoinTax: Partial<BitcoinTaxConfig>;
    public static cryptocompare: CryptocompareConfig;
    public static options: OptionsConfig;

    private constructor() {}

    static instantiateSingleton(path: string) {
        const filename = resolve(path, 'config.yaml');
        logger.info(`Reading config from: ${filename}`);

        const yamlString = fs.readFileSync(filename, 'utf8');
        const config = yaml.safeLoad(yamlString);
        const { value, error } = Joi.validate(config, configSchema, { abortEarly: false });
        if (error instanceof Error) {
            throw error;
        }

        Config.factomd = value.factomd;
        Config.addresses = value.addresses;
        Config.bitcoinTax = value.bitcoinTax;
        Config.cryptocompare = value.cryptocompare;
        Config.options = value.options;
    }
}
