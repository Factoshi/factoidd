import 'mocha';
import { randomBytes } from 'crypto';
import { assert } from 'chai';
import { DAO, TransactionRepository } from '../src/db';
import { generateRandomFctAddress } from 'factom';

const DUMMMY_ADDRESS = generateRandomFctAddress().public;

const generateFakeTx = () => ({
    date: new Date().toUTCString(),
    action: 'INCOME',
    recipient: DUMMMY_ADDRESS,
    txhash: randomBytes(32).toString('hex'),
    volume: Math.floor(Math.random() * 10000),
    symbol: 'FCT',
    price: parseFloat((Math.random() * 1000).toFixed(2)),
    total: Math.floor(Math.random() * 10000), // pretend this is price * volume
    currency: 'GBP',
    height: Math.floor(Math.random() * 200000)
});

describe('Test TransactionRepository', () => {
    let txRepo: TransactionRepository;
    let dao: DAO;
    beforeEach(() => {
        dao = new DAO(':memory:');
        txRepo = new TransactionRepository(dao);
    });

    it('Should insert a row into the transaction repository', async () => {
        const fakeTransaction = generateFakeTx();
        await txRepo.createTable();
        await txRepo.create(fakeTransaction);
        const tx = await dao.get(`SELECT * FROM transactions WHERE txhash = ?`, [
            fakeTransaction.txhash
        ]);
        assert.deepStrictEqual(tx, fakeTransaction);
    });

    it('Should get the highest saved height', async () => {
        await txRepo.createTable();
        const fakeTxs = Array(10)
            .fill(undefined)
            .map(generateFakeTx)
            .sort((a, b) => (a.height > b.height ? -1 : 1));
        await Promise.all(fakeTxs.map(tx => txRepo.create(tx)));
        const res = await txRepo.getHighestSavedHeight();
        assert.isDefined(res);
        assert.strictEqual(res!.height, fakeTxs[0].height);
    });
});
