import winston from 'winston';

import {
    Config,
    Factom,
    getConfigPath,
    getPrice,
    commitTransaction,
    BitcoinTaxAction,
    logger,
    updateCSV,
    CSVSubDir,
    createCSVFile,
} from '../lib';
import { sumFCTIO } from '../lib/transaction';
import { Transaction } from 'factom';
import { toInteger } from '../lib/utils';

interface Input {
    amount: number;
    address: string;
}

async function getTransaction(config: Config, txid: string) {
    try {
        const factom = new Factom(config.factomd);
        const tx = await factom.cli.getTransaction(txid);
        return tx;
    } catch (e) {
        logger.error('Could not get transaction from factomd', e);
        process.exit(1);
    }
}

function getRelevantInputs(config: Config, tx: Transaction): Input[] {
    const relevantInputs = [];
    for (const { address } of config.addresses) {
        const amount = sumFCTIO(tx.inputs, address);
        if (amount > 0) {
            relevantInputs.push({ amount, address });
        }
    }
    return relevantInputs;
}

async function getTransactionPrice(config: Config, tx: Transaction) {
    try {
        const { currency, cryptocompare } = config.options;
        const timestamp = toInteger(tx.timestamp / 1000);
        const price = await getPrice(currency, timestamp, cryptocompare);
        return price;
    } catch (e) {
        logger.error('Could not get price. Spend transaction has not been recorded', e);
        process.exit(1);
    }
}

async function commitToBitcoinTax(config: Config, price: number, inputs: Input[], tx: Transaction) {
    try {
        if (config.options.bitcoinTax) {
            const { bitcoinTaxKey, bitcoinTaxSecret, currency } = config.options;
            const spendTransaction = {
                date: new Date(tx.timestamp).toString(),
                action: BitcoinTaxAction.SPEND,
                symbol: 'FCT',
                currency,
                volume: inputs.reduce((acc, { amount }) => acc + amount, 0),
                price: price,
                memo: tx.id,
                txhash: tx.id,
            };
            await commitTransaction(spendTransaction, { bitcoinTaxKey, bitcoinTaxSecret });
            logger.info('Transaction committed to bitcoin.tax');
        }
    } catch (e) {
        logger.error('Could not commit transaction to bitcoin.tax', e);
        process.exit(1);
    }
}

export async function spend(txid: string, appdir: string) {
    // Set logger.
    const consoleTransport = new winston.transports.Console({
        level: 'info',
        stderrLevels: ['error'],
    });
    logger.add(consoleTransport);

    // Load the config
    const configPath = getConfigPath(appdir);
    const config = new Config(configPath);

    // Get the transaction
    const tx = await getTransaction(config, txid);

    // Get relevant inputs
    const inputs = getRelevantInputs(config, tx);
    if (inputs.length === 0) {
        logger.error('Transaction does not have any inputs from addresses held in config');
        process.exit(1);
    }
    logger.info(`Found relevant transaction inputs: ${JSON.stringify(inputs, undefined, 4)}`);

    // Get the price of FCT at the time of the transaction
    const price = await getTransactionPrice(config, tx);
    logger.info(`FCT price at time of transaction: ${price} ${config.options.currency}`);

    // Commit to bitcoin.tax
    await commitToBitcoinTax(config, price, inputs, tx);

    // Append to CSV
    inputs.forEach(({ address, amount }) => {
        const csvLine = {
            height: tx.blockContext.directoryBlockHeight,
            volume: amount,
            txhash: tx.id,
            currency: config.options.currency,
            date: new Date(tx.timestamp).toISOString(),
            price,
        };
        createCSVFile(appdir, address, CSVSubDir.SPEND);
        updateCSV(address, appdir, csvLine, CSVSubDir.SPEND);
    });
    logger.info('Transaction written to CSV');
}
