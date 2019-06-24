import { Transaction } from 'factom';
import { AddressConfig, TransactionRow } from './types';
import { fetchPrice } from './priceApi';
import { to2DecimalPlaces, asyncCompose, compose, toInteger, info } from './utils';

export const filterAndSumOutputs = (params: { tx: Transaction; conf: AddressConfig }) => {
    const { tx, conf } = params;
    const shouldRecordCoinbaseTx = tx.totalInputs === 0 && conf.recordCoinbase;
    const shouldRecordNonCoinbaseTx = tx.totalInputs > 0 && conf.recordNonCoinbase;
    return shouldRecordCoinbaseTx || shouldRecordNonCoinbaseTx
        ? tx.factoidOutputs
              .filter(output => output.address === conf.address)
              .reduce((total, current) => (total += current.amount), 0)
        : 0;
};

export const factoshisToFactoids = (factoshis: number) => factoshis * Math.pow(10, -8);

const fetchOutputValue = compose<number>(
    filterAndSumOutputs,
    factoshisToFactoids,
    to2DecimalPlaces
);

export const setInitialFields = (params: {
    tx: Transaction;
    conf: AddressConfig;
}): TransactionRow => ({
    timestamp: toInteger(params.tx.timestamp / 1000),
    date: new Date(params.tx.timestamp).toISOString(),
    action: 'INCOME',
    recipient: params.conf.address,
    txhash: params.tx.id,
    memo: params.tx.id, // bitcoin.tax does not display the hash, hence the duplication.
    height: params.tx.blockContext.directoryBlockHeight,
    symbol: 'FCT',
    volume: fetchOutputValue(params),
    currency: params.conf.currency
});

export const addPriceInfo = async (txRow: TransactionRow): Promise<TransactionRow> => {
    const price = await fetchPrice(txRow);
    const total = price * txRow.volume;
    return { ...txRow, price: to2DecimalPlaces(price), total: to2DecimalPlaces(total) };
};

export const buildRow = asyncCompose<TransactionRow>(setInitialFields, addPriceInfo);

export const logNewRow = (txRow: TransactionRow) => {
    info('\x1b[32m%s\x1b[0m', 'Found new receipt:');
    info('\u2023 address:     ', txRow.recipient);
    info('\u2023 hash:        ', txRow.memo);
    info('\u2023 volume:      ', txRow.volume);
    info('\u2023 currency:    ', txRow.currency);
    info('\u2023 value:       ', txRow.total);
    info('\u2023 date:        ', txRow.date);
    info('\u2023 height:      ', txRow.height);
};
