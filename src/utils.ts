/*******************/
/*      Round      */
/*******************/

export const toDecimalPlaces = (decimals: number) => (value: number) => {
    return parseFloat(value.toFixed(decimals));
};

export const to2DecimalPlaces = toDecimalPlaces(2);

export const to8DecimalPlaces = toDecimalPlaces(8);

export const toInteger = toDecimalPlaces(0);
