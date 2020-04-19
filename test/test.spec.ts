import { resolve } from 'path';

import 'mocha';
import sinon from 'sinon';
import { assert } from 'chai';
import axios from 'axios';

import {
    logger,
    batchUpdateIncome,
    Config,
    batchUpdatePrice,
    Factom,
    saveNewTransaction,
    QuitListener,
} from '../src/lib';
import {
    createMockDB,
    generateMockTransactions,
    insertMockTransactions,
    addPriceToTransactions,
} from './utils';

logger.silent = true;

describe('Test Bitcoin.tax', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
        sandbox.stub(axios, 'post');
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('batch updates bitcoin.tax', async () => {
        const { db, table } = await createMockDB();
        const txs = generateMockTransactions(2);
        await insertMockTransactions(table, txs);
        await addPriceToTransactions(table);

        await batchUpdateIncome(
            table,
            { bitcoinTaxKey: 'key', bitcoinTaxSecret: 'secret' },
            new QuitListener(),
            0
        );
        sandbox.assert.calledTwice(axios.post as any);

        // Assert that the transaction has been updated in the DB.
        const dbTxs = await db.all(`SELECT bitcointax FROM transactions WHERE bitcointax = true`);
        assert.lengthOf(dbTxs, 2);
    });

    it('batch updates bitcoin.tax only with transactions that have price', async () => {
        const { db, table } = await createMockDB();
        const txs1 = generateMockTransactions(2);
        await insertMockTransactions(table, txs1);
        await addPriceToTransactions(table);

        // Adds a transaction that will not be updated with a price
        const txs2 = generateMockTransactions(1);
        await insertMockTransactions(table, txs2);

        await batchUpdateIncome(
            table,
            { bitcoinTaxKey: 'key', bitcoinTaxSecret: 'secret' },
            new QuitListener(),
            0
        );
        sandbox.assert.calledTwice(axios.post as any);

        // Assert that the transaction has been updated in the DB.
        const dbTxs = await db.all(`SELECT bitcointax FROM transactions WHERE bitcointax = true`);
        assert.lengthOf(dbTxs, 2);
    });
});

describe('Test Config', () => {
    it('loads a valid config', () => {
        const path = resolve(__dirname, 'mock.config.yaml');
        const config = new Config(path);

        assert.deepStrictEqual(config, {
            factomd: {
                host: 'localhost',
                port: 8088,
                path: '/v2',
                protocol: 'http',
            },
            addresses: [
                {
                    address: 'FA2uheFcSNM7cDBqbunyNWmRbEbRqPPRFp2m7aMyK3dR8axe7sXf',
                    name: 'test',
                    coinbase: true,
                    nonCoinbase: false,
                },
            ],
            keys: {
                cryptocompare: '32f0da139826ba95fb648319d88b86e205a754b959fd0fd839d06e4e1e37a584',
                bitcoinTax: true,
                bitcoinTaxKey: '02446189233ae40e',
                bitcoinTaxSecret: 'acf5786d9d466e5d6dc150b605a3ca7c',
            },
            options: {
                currency: 'GBP',
                startHeight: 143400,
            },
        });
    });
});

describe('Test Update Price', () => {
    const CYRPTOCOMPARE_SECRET = process.env.CYRPTOCOMPARE_SECRET || '';

    it('batch updates price data', async () => {
        const { db, table } = await createMockDB();
        const txs = generateMockTransactions(2);
        await insertMockTransactions(table, txs);

        await batchUpdatePrice(table, CYRPTOCOMPARE_SECRET);

        // Assert that the transaction has been updated in the DB.
        const dbTxs = await db.all(`SELECT price FROM transactions WHERE price > 0`);
        assert.lengthOf(dbTxs, 2);
    });
});

describe('Test Transactions', async () => {
    const HOST = process.env.FACTOM_HOST || 'localhost';
    const PORT = process.env.FACTOM_PORT ? parseInt(process.env.FACTOM_PORT) : 8088;
    const PATH = process.env.FACTOM_PATH || 'v2';
    const PROTOCOL = process.env.FACTOM_PROTOCOL || 'http';

    function newFactom() {
        return new Factom({ host: HOST, port: PORT, path: PATH, protocol: PROTOCOL });
    }

    it('saves a coinbase transaction', async () => {
        const txhash = '5af84df4bc1ae68ce93ac8d62ac2888f2891805ef2a8c3d2cab21f428f29adc0';
        const { db, table } = await createMockDB();
        const addressConf = {
            address: 'FA1yNkC81cVXfUL578K6HLySGssv76uW8N9AMJZBvCnPFPsqyBRU',
            name: 'test',
            coinbase: true, // This should ensure that the tx is saved.
            nonCoinbase: false,
        };
        const factom = newFactom();
        const tx = await factom.cli.getTransaction(txhash);

        await saveNewTransaction(addressConf, table, tx, 'GBP');
        const dbtx = await db.get('SELECT  receivedFCT FROM transactions WHERE txhash = ?', txhash);
        assert.deepStrictEqual(dbtx, { receivedFCT: 4.8 });
    });

    it('does not save a coinbase transaction', async () => {
        const txhash = '5af84df4bc1ae68ce93ac8d62ac2888f2891805ef2a8c3d2cab21f428f29adc0';
        const { db, table } = await createMockDB();
        const addressConf = {
            address: 'FA1yNkC81cVXfUL578K6HLySGssv76uW8N9AMJZBvCnPFPsqyBRU',
            name: 'test',
            coinbase: false, // This should prevent the tx being saved.
            nonCoinbase: false,
        };
        const factom = newFactom();
        const tx = await factom.cli.getTransaction(txhash);

        await saveNewTransaction(addressConf, table, tx, 'GBP');
        const dbtx = await db.get('SELECT * FROM transactions WHERE txhash = ?', txhash);
        assert.isUndefined(dbtx);
    });

    it('saves a non-coinbase transaction', async () => {
        const txhash = '8a751a1cf95b6c54f03eb7f2babd2f28cdc81d0e13fddd10620ff72aa17bccfd';
        const { db, table } = await createMockDB();
        const addressConf = {
            address: 'FA2MZs5wASMo9cCiKezdiQKCd8KA6Zbg2xKXKGmYEZBqon9J3ZKv',
            name: 'test',
            coinbase: true,
            nonCoinbase: true, // This should ensure that the tx is saved.
        };
        const factom = newFactom();
        const tx = await factom.cli.getTransaction(txhash);

        await saveNewTransaction(addressConf, table, tx, 'GBP');
        const dbtx = await db.get('SELECT receivedFCT FROM transactions WHERE txhash = ?', txhash);
        assert.deepStrictEqual(dbtx, { receivedFCT: 5.1132800000000005 });
    });

    it('does not save a non-coinbase transaction', async () => {
        const txhash = '8a751a1cf95b6c54f03eb7f2babd2f28cdc81d0e13fddd10620ff72aa17bccfd';
        const { db, table } = await createMockDB();
        const addressConf = {
            address: 'FA2MZs5wASMo9cCiKezdiQKCd8KA6Zbg2xKXKGmYEZBqon9J3ZKv',
            name: 'test',
            coinbase: true,
            nonCoinbase: false, // This should prevent the tx being saved.
        };
        const factom = newFactom();
        const tx = await factom.cli.getTransaction(txhash);

        await saveNewTransaction(addressConf, table, tx, 'GBP');
        const dbtx = await db.get('SELECT * FROM transactions WHERE txhash = ?', txhash);
        assert.isUndefined(dbtx);
    });

    it('only saves income transactions', async () => {
        const txhash = '8a751a1cf95b6c54f03eb7f2babd2f28cdc81d0e13fddd10620ff72aa17bccfd';
        const { db, table } = await createMockDB();
        const addressConf = {
            address: 'FA3V4VNjfWH3wGAfANGEwNmPkPR3Yc3L1FJGsJ1ZCsKKFe9frJ2a', // this is the sender
            name: 'test',
            coinbase: true,
            nonCoinbase: true,
        };
        const factom = newFactom();
        const tx = await factom.cli.getTransaction(txhash);

        await saveNewTransaction(addressConf, table, tx, 'GBP');
        const dbtx = await db.get('SELECT * FROM transactions WHERE txhash = ?', txhash);
        assert.isUndefined(dbtx);
    });
});

describe('Test util', () => {
    it('shuts down gracefully', async () => {
        const sandbox = sinon.createSandbox();
        sandbox.stub(process, 'exit');

        const quitListener = new QuitListener();
        process.on('SIGTERM', () => quitListener.setShouldQuit(true));

        quitListener.setCanQuit('test', false);
        await new Promise((resolve) => {
            process.once('SIGTERM', () => {
                sandbox.assert.notCalled(process.exit as any);
                resolve();
            });
            process.kill(process.pid, 'SIGTERM');
        });

        quitListener.setCanQuit('test', true);
        sandbox.assert.calledOnce(process.exit as any);
    });
});
