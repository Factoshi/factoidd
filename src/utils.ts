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
    private locked: boolean;
    private quitRequested: boolean;
    private static instance: SigIntListener;

    private constructor() {
        this.locked = false;
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
        if (this.locked) {
            logger.warn('quit requested: process busy, setting 10 second timeout');
            await new Promise((resolve) => setTimeout(resolve, 10000));
            logger.error('forcing exit');
        }
        process.exit(0);
    }

    lock() {
        this.locked = true;
    }

    unlock() {
        this.locked = false;
        if (this.quitRequested) {
            process.exit(0);
        }
    }
}
