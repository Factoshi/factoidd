export interface TransactionRow {
    timestamp: number;
    address: string;
    symbol: string;
    currency: string;
    txhash: string;
    height: number;
    date: string;
    receivedFCT: number;
    sentFCT: number;
    price?: number;
    isCoinbase: boolean;
}

export interface BitcoinTaxParams {
    uri?: string;
    txRow: TransactionRow;
    headers?: { 'X-APIKEY': string; 'X-APISECRET': string };
}

export interface PriceApiParams {
    timestamp: number;
    currency: string;
    headers: { authorization: string };
    rootUri: string;
}
