/*********************/
/*      Compose      */
/*********************/

export const asyncCompose = <T>(...fns: Function[]) => (args?: any): Promise<T> =>
    fns.reduce(async (state, fn) => fn(await state), args);

export const compose = <T>(...fns: Function[]) => (args?: any): T =>
    fns.reduce((state, fn) => fn(state), args);

/*******************/
/*      Round      */
/*******************/

export const toDecimalPlaces = (decimals: number) => (value: number) => {
    return parseFloat(value.toFixed(decimals));
};

export const to2DecimalPlaces = toDecimalPlaces(2);

export const toInteger = toDecimalPlaces(0);

/*****************/
/*      Log      */
/*****************/

const ENV = process.env.NODE_ENV;

export const debug = (args: any) => {
    console.log(args);
    return args;
};

export const info = (...args: any[]) => {
    ENV !== 'test' && console.log(...args);
};

export const warn = (...args: any[]) => {
    console.warn(...args);
};

// 'error' cannot be used as if conflicts with existing names
export const logError = (...args: any[]) => {
    console.error(...args);
};
