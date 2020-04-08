export interface TransactionRow {
    timestamp: number;
    address: string;
    symbol: string;
    currency: string;
    txhash: string;
    height: number;
    date: string;
    receivedFCT: number;
    price?: number;
    bitcointax?: boolean;
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

// Config types
export interface FactomdConfig {
    host: string;
    port: number;
    path: string;
    protocol: string;
    user?: string;
    password?: string;
}

export interface AddressConfig {
    address: string;
    currency: string;
    coinbase: boolean;
    nonCoinbase: boolean;
}

export interface OptionsConfig {
    cryptocompare: string;
    bitcoinTax: boolean;
    bitcoinTaxSecret: string;
    bitcoinTaxKey: string;
    startHeight: number;
}

export interface IConfig {
    factomd: FactomdConfig;
    addresses: AddressConfig[];
    options: OptionsConfig;
}
