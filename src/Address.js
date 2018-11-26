const fs = require('fs');

const axios = require('axios');
const { Parser } = require('json2csv');
const moment = require('moment');

const stopBlocks = require('../stopBlocks.json');
const cli = require('./factomd');

class Address {
    constructor({
        address,
        currency,
        nickname,
        saveToCsv,
        saveToBitcoinTax,
        bitcoinTaxKey,
        bitcoinTaxSecret,
        recordCoinbaseReceipts,
        recordNonCoinbaseReceipts
    }) {
        this.address = address;
        this.currency = currency;
        this.nickname = nickname;
        this.bitcoinTaxKey = bitcoinTaxKey;
        this.bitcoinTaxSecret = bitcoinTaxSecret;
        this.recordCoinbaseReceipts = recordCoinbaseReceipts;
        this.recordNonCoinbaseReceipts = recordNonCoinbaseReceipts;
        this.saveToBitcoinTax = saveToBitcoinTax;
        this.saveToCsv = saveToCsv;

        this.transactionsReceived = [];
        this.transactionWithPriceData = [];

        // Gets stop block from json. If it isn't there, sets stop block to earliest coinbase transaction.
        this.stopBlock = stopBlocks[this.address]
            ? stopBlocks[this.address]
            : '4750f485b6ddf80839afe3c173fe7440be36e138af0a7ec420937bf9c4373c95';
    }

    async getAndParseUnseenBlockData(factoidBlockKeyMR) {
        if (factoidBlockKeyMR === this.stopBlock) return;
        const factoidBlock = await cli.getFactoidBlock(factoidBlockKeyMR);

        factoidBlock.transactions.forEach((transaction, i) => {
            if (this.recordCoinbaseReceipts && i === 0) {
                this._parseFactoidTransaction(transaction);
            }

            if (this.recordNonCoinbaseReceipts && i !== 0) {
                this._parseFactoidTransaction(transaction);
            }
        });

        return this.getAndParseUnseenBlockData(factoidBlock.previousBlockKeyMR);
    }

    async _parseFactoidTransaction(transaction) {
        const { timestamp, factoidOutputs, id } = transaction;

        const volumeReceived = factoidOutputs
            .filter(({ address }) => address === this.address)
            .map(output => output.amount * Math.pow(10, -8))
            .reduce((sum, current) => sum + current, 0);

        if (volumeReceived > 0) {
            const transactionReceived = {
                date: parseInt(timestamp / 1000),
                action: 'Income',
                symbol: 'FCT',
                currency: this.currency,
                volume: volumeReceived,
                txhash: id,
                memo: id,
                recipient: this.address
            };

            this.transactionsReceived.push(transactionReceived);
        }
    }

    async addToBitcoinTax() {
        if (!this.saveToBitcoinTax) return;

        await axios({
            method: 'POST',
            url: 'https://api.bitcoin.tax/v1/transactions',
            data: this.transactionWithPriceData,
            headers: {
                'User-Agent': 'axios/0.18.0',
                'X-APIKEY': this.bitcoinTaxKey,
                'X-APISECRET': this.bitcoinTaxSecret
            },
            json: true
        });
    }

    async addToCsv() {
        if (!this.saveToCsv) return;

        const fields = [
            'date',
            'action',
            'recipient',
            'txhash',
            'volume',
            'symbol',
            'price',
            'total',
            'currency'
        ];
        const filePath = `./csv/${this.nickname}.csv`;

        // if the CSV already exists, do not prepend a header
        const csvExists = fs.existsSync(filePath);
        const options = { header: !csvExists, fields };

        //prep content for inclusion in CSV
        this.transactionWithPriceData.reverse();
        //prettier-ignore
        const transactionsWithHumanDate = this.transactionWithPriceData.map(transaction => {
            const humanDate = moment.unix(transaction.date).format('YYYY-MM-DD HH:mm');
            return {
                ...transaction,
                date: humanDate
            }
        })

        const parser = new Parser(options);
        const csv = parser.parse(transactionsWithHumanDate);

        if (!csvExists) {
            fs.appendFileSync(filePath, csv);
        } else {
            fs.appendFileSync(filePath, '\n' + csv);
        }
    }
}

module.exports = Address;
