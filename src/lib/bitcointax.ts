import axiosRetry, { exponentialDelay } from 'axios-retry';
import axios from 'axios';
import { OptionsConfig } from './types';

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

interface BitcoinTaxData {
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

interface Keys {
    secret: string;
    key: string;
}

function formatTranactionRow(txRow: TransactionRow): BitcoinTaxData {
    return {
        date: txRow.date,
        action: BitcoinTaxAction.INCOME,
        symbol: BitcoinTaxSymbol.FCT,
        currency: txRow.currency,
        volume: txRow.receivedFCT,
        price: txRow.price!,
        memo: txRow.txhash,
        txhash: txRow.txhash,
        recipient: txRow.address,
    };
}

async function saveToBitcoinTax(data: BitcoinTaxData, keys: Keys) {
    const { key, secret } = keys;
    var headers = { 'X-APIKEY': key, 'X-APISECRET': secret };
    var uri = 'https://api.bitcoin.tax/v1/transactions';
    await axios.post(uri, data, { headers });
}

/**
 * Function fills in price data for all transactions in DB with missing data.
 */
export async function batchUpdateBitcoinTax(
    txTable: TransactionTable,
    bottleneck: Bottleneck,
    keys: Keys
) {
    const uncommittedTransactions = await txTable.getUncommittedTransactions();
    // Filter to get only income transactions with known price. This can be updated later if adding other action types.
    const transactions = uncommittedTransactions.filter((tx) => tx.receivedFCT > 0 && tx.price);
    logger.info(`Committing ${transactions.length} transaction(s) to bitcoin.tax`);

    for (let { rowid, ...rest } of transactions) {
        const data = formatTranactionRow(rest);
        await bottleneck.schedule(() => saveToBitcoinTax(data, keys));
        await txTable.updateBitcoinTax(rowid, true).catch((e) => {
            // Failure to write to database after committing to bitcoin tax is a fatal
            // error that cannot be recovered.
            logger.error('Fatal error. Database has inconsistent state.\n', e);
            process.exit(1);
        });
        logger.info(`Committed transaction ${data.memo} to bitoin.tax`);
    }
}
