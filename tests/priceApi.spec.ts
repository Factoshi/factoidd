import { config } from '../init';
import {
    getPriceAPIParams,
    getPriceAPIMethod,
    handlePriceApiResponse,
    setTimeframe,
} from '../priceApi';
import { TransactionRow, PriceApiParams } from '../src/lib/types';
import axios from 'axios';
import { toInteger } from '../src/lib/utils';

jest.mock('axios');

test('should get price API params', () => {
    const addParams = getPriceAPIParams(config);
    const params = addParams({ timestamp: 100, currency: 'GBP' } as TransactionRow);
    const headers = { authorization: config.cryptocompare.secret };
    expect(params).toEqual({
        timestamp: 100,
        currency: 'GBP',
        headers,
        rootUri: 'https://min-api.cryptocompare.com/data/',
    });
});

test('should set the time period to minute for a transaction under 1 week old', () => {
    const sixDaysAgo = toInteger(Date.now() / 1000 - 518400);
    const headers = { authorization: config.cryptocompare.secret };
    const params = setTimeframe({
        timestamp: sixDaysAgo,
        headers,
        currency: 'GBP',
        rootUri: 'https://min-api.cryptocompare.com/data/',
    } as PriceApiParams);
    expect(params).toEqual({
        timestamp: sixDaysAgo,
        headers,
        currency: 'GBP',
        rootUri: 'https://min-api.cryptocompare.com/data/histominute?',
    });
});

test('should set the time period to hour for a transaction that is at least 1 week old', () => {
    const sevenDaysAgo = toInteger(Date.now() / 1000 - 608400);
    const headers = { authorization: config.cryptocompare.secret };
    const params = setTimeframe({
        timestamp: sevenDaysAgo,
        headers,
        currency: 'GBP',
        rootUri: 'https://min-api.cryptocompare.com/data/',
    } as PriceApiParams);
    expect(params).toEqual({
        timestamp: sevenDaysAgo,
        headers,
        currency: 'GBP',
        rootUri: 'https://min-api.cryptocompare.com/data/histohour?',
    });
});

test('should call axios.get with the correct URL', async () => {
    const getPrice = getPriceAPIMethod(config);
    const headers = { authorization: config.cryptocompare.secret };
    await getPrice({
        timestamp: 100,
        currency: 'GBP',
        headers,
        rootUri: 'https://min-api.cryptocompare.com/data/histohour?',
    });
    expect(
        axios.get
    ).toHaveBeenCalledWith(
        'https://min-api.cryptocompare.com/data/histohour?fsym=FCT&tsym=GBP&limit=1&toTs=100',
        { headers }
    );
});

test('should handle successful price API request', () => {
    const data = { Response: 'Success', HasWarning: false, Data: [null, { close: 10 }] };
    const price = handlePriceApiResponse({ data });
    expect(price).toBe(10);
});

test('should throw on unsuccessful price API request', () => {
    const data = { Response: 'Error', Message: 'Bad request' };
    const message = 'call to cryptocompare failed: Bad request';
    expect(() => handlePriceApiResponse({ data })).toThrow(message);
});
