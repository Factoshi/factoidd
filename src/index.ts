import { config } from './init';
import { Transaction } from 'factom';
import { factomEvent } from './init';
import { saveRowToBitcoinTax } from './bitcoin.tax';
import { buildRow, logNewRow } from './transactionRow';
import { AddressConfig } from './types';
import { appendRowToCsv } from './csv';
import { fetchHistoricalTransactions, saveHeight } from './history';
import { info, logError, exitGracefully, wait, exitError } from './utils';

/********************************/
/*      Process Listeners       */
/********************************/

const shutdownListeners = () => {
    factomEvent.removeAllListeners();
    return wait(100);
};
process.on('SIGTERM', () => exitGracefully(shutdownListeners));
process.on('SIGINT', () => exitGracefully(shutdownListeners));
process.on('unhandledRejection', (_, promise) => {
    logError(`Unhandled Rejection at:`, promise);
    process.exit(1);
});

/***********************************/
/*      Transaction Handlers       */
/***********************************/

/**
 * Creates a transaction listener which handles all new and old transactions.
 * @param {AddressConfig} conf Config for a specific address.
 */
const createTransactionListener = (conf: AddressConfig) => {
    return async (tx: Transaction) => {
        try {
            const txRow = await buildRow({ tx, conf });
            // Tranactions with 0 volume do not meet the criteria set out in the conf and are thus ignored.
            if (txRow.volume > 0) {
                // Highest risk write comes first. If that fails the application will quit to protect state.
                await saveRowToBitcoinTax(txRow);
                await appendRowToCsv(txRow);
                // Height only saved after a new block has been successfully processed.
                saveHeight(txRow.height! + 1);
                logNewRow(txRow);
            }
        } catch (err) {
            logError(`application failed at transaction: ${tx.id}.`);
            exitError(err);
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
