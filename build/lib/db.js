"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
class TransactionTable {
    constructor(db) {
        this.db = db;
    }
    createTransactionTable() {
        logger_1.logger.debug(`Creating transaction table if it does not exist`);
        return this.db.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                txhash      TEXT,
                address     TEXT,
                date        TEXT,
                timestamp   INTEGER,
                receivedFCT REAL,
                sentFCT     REAL,
                currency    TEXT,
                height      INTEGER,
                price       REAL,
                csv         BOOLEAN DEFAULT false,
                bitcointax  BOOLEAN DEFAULT false,
                isCoinbase  BOOLEAN,
                PRIMARY KEY (txhash, address, currency)
        );`);
    }
    /**
     * Saves a transaction without price data.
     * @param tx Transaction row.
     */
    insertRawTransactionRow(tx) {
        const values = {
            ':txhash': tx.txhash,
            ':address': tx.address,
            ':date': tx.date,
            ':timestamp': tx.timestamp,
            ':receivedFCT': tx.receivedFCT,
            ':sentFCT': tx.sentFCT,
            ':currency': tx.currency,
            ':height': tx.height,
            ':isCoinbase': tx.isCoinbase,
        };
        return this.db.run(`INSERT INTO transactions 
                (txhash, address, date, timestamp, receivedFCT, sentFCT, currency, height, isCoinbase) 
            VALUES 
                (:txhash, :address, :date, :timestamp, :receivedFCT, :sentFCT, :currency, :height, :isCoinbase);`, values);
    }
    getTransactionsWithNullPrice() {
        return this.db.all(`
            SELECT 
                rowid, 
                currency, 
                timestamp, 
                txhash,
                height
            FROM 
                transactions
            WHERE
                price IS NULL
        `);
    }
    updatePrice(rowid, price) {
        return this.db.run('UPDATE transactions SET price = ? WHERE rowid = ?', price, rowid);
    }
    getUncommittedTransactions() {
        return this.db.all(`
            SELECT 
                *
            FROM 
                transactions
            WHERE
                bitcointax = false
        `);
    }
    updateBitcoinTax(rowid, bool) {
        return this.db.run('UPDATE transactions SET committed = ? WHERE rowid = ?;', bool, rowid);
    }
    async getMaxHeight() {
        const max = await this.db.get('SELECT MAX(height) FROM transactions;');
        return max['MAX(height)'] || -1;
    }
}
exports.TransactionTable = TransactionTable;
