import { resolve } from 'path';

export const CONFIG_DIR = process.env.FACTOIDD_CONFIG_DIR || resolve(__dirname, '..', 'config');
export const DATA_DIR = process.env.FACTOIDD_DATA_DIR || resolve(__dirname, '..', 'data');
