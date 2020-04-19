import { initialiseDatabase, TransactionTable, TransactionRow } from '../src/lib';
import { generateRandomFctAddress } from 'factom';
import { randomBytes } from 'crypto';

export async function createMockDB() {
    const db = await initialiseDatabase(':memory:');
    const table = new TransactionTable(db);
    await table.createTransactionTable();
    return { db, table };
}

export function generateMockTransactions(num: number): TransactionRow[] {
    const mockTransactions = [];
    for (let i = 0; i < num; i++) {
        mockTransactions.push({
            timestamp: new Date().getTime(),
            address: generateRandomFctAddress().public,
            name: 'test',
            symbol: 'FCT',
            currency: 'GBP',
            txhash: randomBytes(32).toString('hex'),
            height: Math.floor(Math.random() * 250000),
            date: new Date().toString(),
            receivedFCT: Math.floor(Math.random() * 10000),
        });
    }
    return mockTransactions;
}

export async function addPriceToTransactions(table: TransactionTable) {
    const txs = await table.getTransactionsWithNullPrice();
    for (const { rowid } of txs) {
        await table.updatePrice(rowid, Math.floor(Math.random() * 1000) / 100);
    }
}

export async function insertMockTransactions(table: TransactionTable, txs: TransactionRow[]) {
    for (const tx of txs) {
        await table.insertUncommittedTransaction(tx);
    }
}
