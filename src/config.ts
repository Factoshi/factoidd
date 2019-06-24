import yaml from 'js-yaml';
import fs from 'fs';
import { Config } from './types';
import { compose } from './utils';
import { resolve } from 'path';
import { ValidationError } from '@hapi/joi';

const Joi = require('joi').extend(require('joi-factom'));

// Create joi schemas
const addressConfigSchema = {
    address: Joi.factom()
        .factoidAddress('public')
        .required(),
    currency: Joi.string()
        .alphanum()
        .uppercase()
        .length(3)
        .required(),
    recordCoinbase: Joi.boolean().required(),
    recordNonCoinbase: Joi.boolean().required()
};

const factomdConfigSchema = {
    host: Joi.string().required(),
    port: Joi.number()
        .port()
        .required(),
    path: Joi.string().required(),
    protocol: Joi.string().required(),
    user: Joi.string(),
    password: Joi.string()
};

const bitcoinTaxSchema = {
    key: Joi.string()
        .alphanum()
        .length(16),
    secret: Joi.string()
        .alphanum()
        .length(32)
};

const cryptocompareSchema = {
    secret: Joi.string()
        .alphanum()
        .length(64)
        .required()
};

const optionsSchema = {
    startHeight: Joi.number()
        .positive()
        .default(143400),
    minTime: Joi.number().default(100)
};

const configSchema = {
    factomd: Joi.object(factomdConfigSchema).default({
        host: 'api.factomd.net',
        port: 443,
        path: '/v2',
        protocol: 'https'
    }),
    addresses: Joi.array()
        .has(addressConfigSchema)
        .required(),
    cryptocompare: Joi.object(cryptocompareSchema).required(),
    bitcoinTax: Joi.object(bitcoinTaxSchema).default({}),
    options: Joi.object(optionsSchema).default({ startHeight: 143400, minTime: 100 })
};

type ValidationResult = { value: Config; error: ValidationError | null };

export const resolvePath = (relativePath: string) => resolve(__dirname, relativePath);

export const loadConfig = (path: string) => fs.readFileSync(path, 'utf8');

export const parseConfig = (yamlString: string) => yaml.safeLoad(yamlString);

export const validateConfig = (config: Partial<Config>): ValidationResult =>
    Joi.validate(config, configSchema, { abortEarly: false });

export const handleValidationResult = ({ value, error }: ValidationResult) => {
    if (error instanceof Error) {
        throw error;
    }
    return value;
};

export const createConfig = compose<Config>(
    resolvePath,
    loadConfig,
    parseConfig,
    validateConfig,
    handleValidationResult,
    Object.freeze
);
