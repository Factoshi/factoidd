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

/**
 * Enables graceful shutdown
 */
export class QuitListener {
    private canQuit: { [key: string]: boolean };
    private shouldQuit: boolean;

    constructor() {
        this.canQuit = {};
        this.shouldQuit = false;
    }

    private quitIfAble() {
        const canQuit = Object.values(this.canQuit).every((v) => v);

        if (this.shouldQuit && canQuit) {
            logger.warn('Bye!');
            process.exit(0);
        }
    }

    setShouldQuit(shouldQuit: boolean) {
        logger.warn('Shutting down...');
        this.shouldQuit = shouldQuit;
        this.quitIfAble();
    }

    /**
     * Sets boolean to determine whether it is currently safe to quit.
     */
    setCanQuit(label: string, canQuit: boolean) {
        this.canQuit = { ...this.canQuit, [label]: canQuit };
        this.quitIfAble();
    }
}
