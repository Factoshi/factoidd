import axiosRetry, { exponentialDelay } from 'axios-retry';
import axios from 'axios';

import { TransactionTable } from './db';
import { logger } from './logger';
import Bottleneck from 'bottleneck';
import { TransactionRow } from './types';

axiosRetry(axios, { retries: 2, retryDelay: exponentialDelay });

enum BitcoinTaxAction {
    SELL = 'SELL',
    BUY = 'BUY',
    INCOME = 'INCOME',
    GIFTING = 'GIFTING',
    MINING = 'MINING',
    SPEND = 'SPEND',
    GIFT = 'GIFT',
    DONATION = 'DONATION',
}

enum BitcoinTaxSymbol {
    FCT = 'FCT',
}

interface Keys {
    bitcoinTaxSecret: string;
    bitcoinTaxKey: string;
}

interface AddTransactionData {
    date: string;
    action: BitcoinTaxAction;
    symbol: BitcoinTaxSymbol;
    currency: string;
    volume: number;
    price: number;
    memo: string;
    txhash: string;
    recipient: string;
}

/**
 * Format transaction for bitcoin.tax API
 */
function formatTransaction(txRow: TransactionRow, action: BitcoinTaxAction): AddTransactionData {
    return {
        date: txRow.date,
        action,
        symbol: BitcoinTaxSymbol.FCT,
        currency: txRow.currency,
        volume: txRow.receivedFCT,
        price: txRow.price!,
        memo: txRow.txhash,
        txhash: txRow.txhash,
        recipient: txRow.address,
    };
}

/**
 * Commit tranaction to bitcoin.tax API
 */
async function commitTransaction(data: AddTransactionData, keys: Keys) {
    try {
        const { bitcoinTaxKey, bitcoinTaxSecret } = keys;
        var headers = { 'X-APIKEY': bitcoinTaxKey, 'X-APISECRET': bitcoinTaxSecret };
        var uri = 'https://api.bitcoin.tax/v1/transactions';
        await axios.post(uri, data, { headers });
    } catch (e) {
        if (e.response.status === 401) {
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
export async function batchUpdateIncome(db: TransactionTable, bottleneck: Bottleneck, keys: Keys) {
    const transactions = await db.getUncommittedTransactions();
    // Filter to get only income transactions with known price. This can be updated later if adding other action types.
    logger.info(`Committing ${transactions.length} transaction(s) to bitcoin.tax`);

    for (let [i, { rowid, ...tx }] of transactions.entries()) {
        if (i % 10 === 0) {
            logger.info(`Commiting transaction ${i} of ${transactions.length} to bitoin.tax`);
        }
        logger.debug(`Committing transaction ${tx.txhash} to bitoin.tax`);

        const data = formatTransaction(tx, BitcoinTaxAction.INCOME);
        await bottleneck.schedule(() => commitTransaction(data, keys));
        await db.updateBitcoinTax(rowid, true).catch((e) => {
            // Failure to write to database after committing to bitcoin tax is a fatal
            // error that cannot be recovered and requires user intervention.
            logger.error('Fatal error');
            logger.error(
                `IMPORTANT! Remove transaction ${tx.txhash} from bitcoin.tax before restarting.`
            );
            logger.error(e);
            process.exit(1);
        });
    }

    logger.info(`Comitted ${transactions.length} transaction(s) to bitcoin.tax`);
}