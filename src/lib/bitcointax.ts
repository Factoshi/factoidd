import axiosRetry, { exponentialDelay } from 'axios-retry';
import axios from 'axios';

import { TransactionTable } from './db';
import { logger } from './logger';
import Bottleneck from 'bottleneck';
import { TransactionRow } from './types';
import { QuitListener, to8DecimalPlaces } from './utils';

axiosRetry(axios, { retryDelay: exponentialDelay });

export enum BitcoinTaxAction {
    SELL = 'SELL',
    BUY = 'BUY',
    INCOME = 'INCOME',
    GIFTING = 'GIFTING',
    MINING = 'MINING',
    SPEND = 'SPEND',
    GIFT = 'GIFT',
    DONATION = 'DONATION',
}

interface Keys {
    bitcoinTaxSecret: string;
    bitcoinTaxKey: string;
}

interface AddTransactionData {
    date: string;
    action: BitcoinTaxAction;
    symbol: string;
    currency: string;
    volume: number;
    price: number;
    memo: string;
    txhash: string;
    recipient?: string;
}

/**
 * Format transaction for bitcoin.tax API
 */
function formatTransaction(txRow: TransactionRow, action: BitcoinTaxAction): AddTransactionData {
    return {
        date: txRow.date,
        action,
        symbol: 'FCT',
        currency: txRow.currency,
        volume: to8DecimalPlaces(txRow.receivedFCT),
        price: txRow.price!,
        memo: txRow.txhash,
        txhash: txRow.txhash,
        recipient: txRow.address,
    };
}

/**
 * Commit tranaction to bitcoin.tax API
 */
export async function commitTransaction(data: AddTransactionData, keys: Keys) {
    try {
        const { bitcoinTaxKey, bitcoinTaxSecret } = keys;
        var headers = { 'X-APIKEY': bitcoinTaxKey, 'X-APISECRET': bitcoinTaxSecret };
        var uri = 'https://api.bitcoin.tax/v1/transactions';
        await axios.post(uri, data, { headers });
    } catch (e) {
        if (e.response?.status === 401) {
            logger.error('Invalid bitcoin.tax credentials. Please check and try again.');
            process.exit(1);
        }
        throw e;
    }
}

/**
 * Fill price data for all outstanding income transactions held in DB.
 * @param txTable The database table holding the income transactions.
 * @param bottleneck Rate limiter instance.
 * @param keys Bitcoin.tax keys.
 */
export async function batchUpdateIncome(
    db: TransactionTable,
    keys: Keys,
    ql: QuitListener,
    minTime = 500
) {
    const transactions = await db.getUncommittedTransactions();
    if (transactions.length === 0) {
        return;
    }
    const bottleneck = new Bottleneck({ minTime });

    for (let [i, { rowid, ...tx }] of transactions.entries()) {
        if (i % 10 === 0) {
            logger.info(`Commiting transaction ${i + 1} of ${transactions.length} to bitoin.tax`);
        }
        const data = formatTransaction(tx, BitcoinTaxAction.INCOME);

        // Prevent quit until bitcoin.tax updated and recorded in database
        ql.setCanQuit('bitcoin.tax', false);

        await bottleneck.schedule(() => commitTransaction(data, keys));
        await db.updateBitcoinTax(rowid, true).catch((e) => {
            // Failure to write to database after committing to bitcoin tax is a fatal
            // error that cannot be recovered and requires user intervention. This is because there is
            // now an inconsistency between bitcoin.tax and the local database that will not be recovered
            // on restart. At the time of writing, there is no way to delete transactions from bitcoin.tax
            // via the API, so the inconsistency cannot be remedied in code.
            logger.error('Fatal error');
            logger.error(`Remove transaction ${tx.txhash} from bitcoin.tax before restarting`, e);
            process.exit(1);
        });

        // Allow quit following transactions
        ql.setCanQuit('bitcoin.tax', true);
    }
}
