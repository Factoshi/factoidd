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
        process.on('SIGINT', this.tryAbort);
        process.on('SIGTERM', this.tryAbort);
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

    private async tryAbort() {
        this.quitRequested = true;
        if (this.locks > 0) {
            logger.warn('quit requested: process busy, setting 10 second timeout');
            await new Promise((resolve) => setTimeout(resolve, 10000));
            logger.error('forcing exit');
        }
        process.exit(0);
    }

    lock() {
        this.locks++;
    }

    unlock() {
        this.locks--;
        if (this.quitRequested && this.locks == 0) {
            process.exit(0);
        }
    }
}
