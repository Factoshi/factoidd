import { config } from './init';
import { Transaction } from 'factom';
import { factomEvent } from './init';
import { saveRowToBitcoinTax } from './bitcoin.tax';
import { buildRow, logNewRow } from './transactionRow';
import { AddressConfig } from './types';
import { writeRowToCsv } from './csv';
import { fetchHistoricalTransactions, saveHeight } from './history';
import { info, logError } from './utils';

/**********************/
/*      Process       */
/**********************/

// Prevent listeners from accepting new events prior to exit
const exit = async (code: number) => {
    factomEvent.removeAllListeners();
    // wait to ensure that the running listeners have had a chance to finish.
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.exit(code);
};
const exitGracefully = async () => {
    info('Shutting down...');
    exit(0);
};
const exitError = async (error: Error) => {
    logError(error);
    logError('Exiting to protect state');
    exit(1);
};
process.on('SIGTERM', exitGracefully);
process.on('SIGINT', exitGracefully);
process.on('unhandledRejection', async (reason, promise) => {
    // This should never run.
    logError('Unhandled Rejection at:', promise, 'reason:', reason);
    exit(1);
});

/****************************/
/*      Event Emitter       */
/****************************/

/**
 * Creates a transaction listener which handles all new and old transactions.
 * @param {AddressConfig} conf Config for a specific address.
 */
const createTransactionListener = (conf: AddressConfig) => {
    return async (tx: Transaction) => {
        const txRow = await buildRow({ tx, conf });
        // Tranactions with 0 volume do not meet the criteria set out in the conf and are thus ignored.
        if (txRow.volume > 0) {
            // Highest risk write comes first. If that fails the application will quit to protect state.
            await saveRowToBitcoinTax(txRow);
            await writeRowToCsv(txRow);
            logNewRow(txRow);
            // Height only saved after a new block has been successfully processed.
            saveHeight(txRow.height! + 1);
        }
    };
};

// Start the address listeners that will handle all new transactions.
config.addresses.forEach(addressConf => {
    info('Listening for new transactions to', addressConf.address);
    factomEvent.on(addressConf.address, createTransactionListener(addressConf));
});

factomEvent.on('error', exitError);

/*******************************/
/*      Fetch Historical       */
/*******************************/

/**
 * Runs once on startup to backfill transactions since last run. Will emit transactions
 * to be handled via via factomEvent. Does not handle transactions directly.
 */
fetchHistoricalTransactions().catch(exitError);
