const querystring = require('querystring');
const fs = require('fs');

const axios = require('axios');
const _ = require('lodash');

const Address = require('./Address');
const cli = require('./factomd');
const { addresses } = require('../config.json');

function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

async function getFactoidBlockHeadRef() {
    const { keymr } = await cli.factomdApi('directory-block-head');

    const { factoidBlockRef } = await cli.getDirectoryBlock(keymr);

    return factoidBlockRef;
}

async function getPrice(transaction) {
    const timeSinceTransaction = Date.now() - transaction.date * 1000;
    const oneWeek = 600000000;
    //prettier-ignore
    const apiTimePeriod = timeSinceTransaction > oneWeek ? 'histohour' : 'histominute';

    const fctToCurrencyString = querystring.stringify({
        fsym: 'FCT',
        tsym: transaction.currency.toUpperCase(),
        limit: 1,
        toTs: transaction.date
    });

    const uri = `https://min-api.cryptocompare.com/data/${apiTimePeriod}?${fctToCurrencyString}`;

    const { data } = await axios.get(uri);
    if (data.Response === 'Error') {
        throw new Error(`call to crytocompare failed with message: ${data.Message}`);
    }

    // return average price for time period
    const { high, low, open, close } = data.Data[1];
    const price = (high + low + open + close) / 4;
    return {
        ...transaction,
        price: round(price, 2),
        total: round(price * transaction.volume, 2)
    };
}

function setNewStopBlock(address, keyMR) {
    const currentStops = require('../stopBlocks.json');
    currentStops[address] = keyMR;
    fs.writeFileSync(
        __dirname + '/../stopBlocks.json',
        JSON.stringify(currentStops)
    );
}

async function checkAndProcessNewReceipts(address) {
    try {
        const factoidBlockRef = await getFactoidBlockHeadRef();
        await address.getAndParseUnseenBlockData(factoidBlockRef);

        for (const transaction of address.transactionsReceived) {
            // must rate limit calls to cryptocompare API.
            // formula is millis in a minute over max calls per minute
            // multiplied by the number of addresses being monitored
            // result is necessary delay between each call
            const waitingPeriod = 40 * addresses.length;
            await new Promise(resolve => setTimeout(resolve, waitingPeriod));

            const transactionWithPriceData = await getPrice(transaction);

            address.transactionWithPriceData.push(transactionWithPriceData);
        }

        if (address.transactionWithPriceData.length) {
            await Promise.all(address.transactionWithPriceData);
            await address.addToBitcoinTax();
            await address.addToCsv();

            console.log(
                `Saved new transactions for ${address.nickname}:`,
                address.transactionWithPriceData
            );
        }

        // prepare instance data for fresh cycle
        address.stopBlock = factoidBlockRef;
        address.transactionsReceived = [];
        address.transactionWithPriceData = [];
        setNewStopBlock(address.address, address.stopBlock);
        return setTimeout(() => checkAndProcessNewReceipts(address), 600000);
    } catch (err) {
        console.error(err);
    }
}

function main() {
    const addressInstances = addresses.map(address => new Address(address));

    addressInstances.forEach(addressInstance =>
        checkAndProcessNewReceipts(addressInstance)
    );
}

main();
