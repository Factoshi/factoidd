export interface TransactionRow {
    timestamp?: number;
    date: string;
    action: string;
    recipient: string;
    memo?: string; // transaction hash to be shown on bitcoin.tax
    volume: number;
    symbol: string;
    price?: number;
    total?: number;
    currency: string;
    txhash: string;
    height?: number;
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

// Config

export interface AddressConfig {
    address: string;
    currency: string;
    recordCoinbase?: boolean;
    recordNonCoinbase?: boolean;
}

export interface FactomdConfig {
    host: string;
    port: number;
    path: string;
    protocol: string;
    user?: string;
    password?: string;
}

export interface BitcoinTaxConfig {
    key: string;
    secret: string;
}

export interface CryptocompareConfig {
    secret: string;
}

export interface OptionsConfig {
    startHeight: number;
    minTime: number;
}

export interface Config {
    factomd: Partial<FactomdConfig>;
    addresses: AddressConfig[];
    bitcoinTax: Partial<BitcoinTaxConfig>;
    cryptocompare: CryptocompareConfig;
    options: OptionsConfig;
}

export interface Heights {
    startHeight: number;
    stopHeight?: number;
}
