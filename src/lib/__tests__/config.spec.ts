import { randomBytes } from 'crypto';
import { generateRandomFctAddress } from 'factom';
import { validateConfig, parseConfig } from '../config';
import { Config } from '../types';

const config: Config = {
    factomd: {
        host: 'localhost',
        port: 8088,
        path: '/v2',
        protocol: 'http',
        user: 'admin',
        password: 'password'
    },
    addresses: [
        {
            address: generateRandomFctAddress().public,
            currency: 'GBP',
            recordCoinbase: true,
            recordNonCoinbase: false
        }
    ],
    bitcoinTax: {
        key: randomBytes(8).toString('hex'),
        secret: randomBytes(16).toString('hex')
    },
    cryptocompare: {
        secret: randomBytes(32).toString('hex')
    },
    options: {
        startHeight: 100,
        minTime: 100
    }
};
Object.freeze(config);

test('should parse yaml string', () => {
    const config = parseConfig('meaningOfLife: 42');
    expect(config).toEqual({ meaningOfLife: 42 });
});

test('should validate full config', () => {
    const validationResult = validateConfig(config);
    expect(validationResult.error).toBeNull();
    expect(validationResult.value).toEqual(config);
});

test('should fill in default options', () => {
    const partialConfig: Partial<Config> = {
        addresses: [
            {
                address: generateRandomFctAddress().public,
                currency: 'GBP',
                recordCoinbase: true,
                recordNonCoinbase: true
            }
        ],
        cryptocompare: {
            secret: randomBytes(32).toString('hex')
        }
    };
    const validationResult = validateConfig(partialConfig);
    expect(validationResult.error).toBeNull();
    expect(validationResult.value).toEqual({
        ...partialConfig,
        factomd: {
            host: 'api.factomd.net',
            port: 443,
            path: '/v2',
            protocol: 'https'
        },
        bitcoinTax: {},
        options: {
            minTime: 100,
            startHeight: 143400
        }
    });
});

test('should return error if top level required values are missing', () => {
    const validationResult = validateConfig({});
    expect(validationResult.error).toBeInstanceOf(Error);
    expect(validationResult.error!.details).toEqual([
        {
            message: '"addresses" is required',
            path: ['addresses'],
            type: 'any.required',
            context: { key: 'addresses', label: 'addresses' }
        },
        {
            message: '"cryptocompare" is required',
            path: ['cryptocompare'],
            type: 'any.required',
            context: { key: 'cryptocompare', label: 'cryptocompare' }
        }
    ]);
});

test('should return error if second level required values are missing', () => {
    const partialConfig = ({
        addresses: [],
        factomd: {},
        cryptocompare: {}
    } as any) as Partial<Config>;
    const validationResult = validateConfig(partialConfig);
    expect(validationResult.error).toBeInstanceOf(Error);
    expect(validationResult.error!.details).toEqual([
        {
            message: '"host" is required',
            path: ['factomd', 'host'],
            type: 'any.required',
            context: { key: 'host', label: 'host' }
        },
        {
            message: '"port" is required',
            path: ['factomd', 'port'],
            type: 'any.required',
            context: { key: 'port', label: 'port' }
        },
        {
            message: '"path" is required',
            path: ['factomd', 'path'],
            type: 'any.required',
            context: { key: 'path', label: 'path' }
        },
        {
            message: '"protocol" is required',
            path: ['factomd', 'protocol'],
            type: 'any.required',
            context: { key: 'protocol', label: 'protocol' }
        },
        {
            message: '"addresses" does not contain at least one required match',
            path: ['addresses'],
            type: 'array.hasUnknown',
            context: { key: 'addresses', label: 'addresses' }
        },
        {
            message: '"secret" is required',
            path: ['cryptocompare', 'secret'],
            type: 'any.required',
            context: { key: 'secret', label: 'secret' }
        }
    ]);
});
