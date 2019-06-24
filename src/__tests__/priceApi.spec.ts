import { config } from '../init';
import {
    getPriceAPIParams,
    getPriceAPIMethod,
    handlePriceApiResponse
} from '../priceApi';
import { TransactionRow } from '../types';
import axios from 'axios';

jest.mock('axios');

test('should get price API params', () => {
    const addParams = getPriceAPIParams(config);
    const params = addParams({ timestamp: 100, currency: 'GBP' } as TransactionRow);
    const headers = { authorization: config.cryptocompare.secret };
    expect(params).toEqual({
        timestamp: 100,
        currency: 'GBP',
        headers,
        rootUri: 'https://min-api.cryptocompare.com/data/histohour?'
    });
});

test('should call axios.get with the correct URL', async () => {
    const addParams = getPriceAPIParams(config);
    const params = addParams({ timestamp: 100, currency: 'GBP' } as TransactionRow);
    const getPrice = getPriceAPIMethod(config);
    await getPrice(params);
    const headers = { authorization: config.cryptocompare.secret };
    expect(axios.get).toHaveBeenCalledWith(
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
