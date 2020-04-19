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
    FactomdConfig,
    AddressConfig,
} from '../lib';
import { sumFCTIO } from '../lib/transaction';
import { Transaction } from 'factom';
import { toInteger } from '../lib/utils';

interface Input {
    amount: number;
    address: string;
    name: string;
}

async function getTransaction(config: FactomdConfig, txid: string) {
    try {
        const factom = new Factom(config);
        const tx = await factom.cli.getTransaction(txid);
        return tx;
    } catch (e) {
        logger.error('Could not get transaction from factomd');
        throw e;
    }
}

function getRelevantInputs(addresses: AddressConfig[], tx: Transaction): Input[] {
    const inputs = [];
    for (const { address, name } of addresses) {
        const amount = sumFCTIO(tx.inputs, address);
        if (amount > 0) {
            inputs.push({ name, address, amount });
        }
    }
    if (inputs.length === 0) {
        throw new Error('Transaction does not have any inputs from addresses held in config');
    }
    logger.info(`Found relevant transaction inputs: ${JSON.stringify(inputs, undefined, 4)}`);
    return inputs;
}

async function getTransactionPrice(config: Config, tx: Transaction) {
    try {
        const { currency } = config.options;
        const { cryptocompare } = config.keys;

        const timestamp = toInteger(tx.timestamp / 1000);
        const price = await getPrice(currency, timestamp, cryptocompare);
        logger.info(`FCT price at time of transaction: ${price} ${currency}`);
        return price;
    } catch (e) {
        logger.error('Could not get price. Spend transaction has not been recorded');
        throw e;
    }
}

async function commitToBitcoinTax(config: Config, price: number, inputs: Input[], tx: Transaction) {
    try {
        const { bitcoinTaxKey, bitcoinTaxSecret, bitcoinTax } = config.keys;
        const { currency } = config.options;

        if (bitcoinTax) {
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
        logger.error('Could not commit transaction to bitcoin.tax');
        throw e;
    }
}

export async function spend(txid: string, appdir: string) {
    try {
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
        const tx = await getTransaction(config.factomd, txid);

        // Get relevant inputs
        const inputs = getRelevantInputs(config.addresses, tx);

        // Get the price of FCT at the time of the transaction
        const price = await getTransactionPrice(config, tx);

        // Commit to bitcoin.tax
        await commitToBitcoinTax(config, price, inputs, tx);

        // Append to CSV
        inputs.forEach(({ address, amount, name }) => {
            const csvLine = {
                name,
                height: tx.blockContext.directoryBlockHeight,
                volume: amount,
                address,
                txhash: tx.id,
                currency: config.options.currency,
                date: new Date(tx.timestamp).toISOString(),
                price,
            };
            createCSVFile(appdir, CSVSubDir.SPEND, name);
            updateCSV(appdir, CSVSubDir.SPEND, csvLine);
        });
        logger.info('Transaction written to CSV');
    } catch (e) {
        logger.error('Failed to create spend transaction: ', e);
    }
}
