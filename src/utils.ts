/*******************/
/*      Round      */
/*******************/

import { logger } from './logger';

export const toDecimalPlaces = (decimals: number) => (value: number) => {
    return parseFloat(value.toFixed(decimals));
};

export const to2DecimalPlaces = toDecimalPlaces(2);

export const to8DecimalPlaces = toDecimalPlaces(8);

export const toInteger = toDecimalPlaces(0);

export class SigIntListener {
    private locks: number;
    private quitRequested: boolean;
    private static instance: SigIntListener;

    private constructor() {
        this.locks = 0;
        this.quitRequested = false;
        process.on('SIGINT', async () => await this.tryInterrupt());
        process.on('SIGTERM', async () => await this.tryInterrupt());
    }

    public static init() {
        if (!SigIntListener.instance) {
            SigIntListener.instance = new SigIntListener();
        }
    }

    public static getInstance(): SigIntListener {
        SigIntListener.init();
        return SigIntListener.instance;
    }

    private async tryInterrupt() {
        this.quitRequested = true;
        logger.info('Shutting down...');

        if (this.locks > 0) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            logger.error('Process failed to unlock: force qutting');
            this.exit(1);
        }

        this.exit(0);
    }

    private exit(code: number) {
        logger.info('Bye!');
        process.exit(code);
    }

    lock() {
        this.locks++;
    }

    unlock() {
        this.locks--;
        if (this.quitRequested && this.locks == 0) {
            this.exit(0);
        }
    }
}
