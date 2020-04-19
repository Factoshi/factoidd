export interface TransactionRow {
    timestamp: number;
    address: string;
    name: string;
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
}

export interface AddressConfig {
    address: string;
    name: string;
    coinbase: boolean;
    nonCoinbase: boolean;
}

export interface OptionsConfig {
    currency: string;
    startHeight: number;
}

export interface KeyConfig {
    bitcoinTax: boolean;
    bitcoinTaxSecret: string;
    bitcoinTaxKey: string;
    cryptocompare: string;
}

export interface IConfig {
    factomd: FactomdConfig;
    addresses: AddressConfig[];
    options: OptionsConfig;
    keys: KeyConfig;
}
