# Factoid Address Monitor Daemon

##### factoid-address-monitord

This tool is built to help users track the value of payments received to a FCT
address in a fiat currency of their choice. It will backfill historical price data for
old transactions, and will additionally watch a given address for any new transactions to that
address.

The script is highly flexible. It allows users to monitor multiple adresses, and includes
multiple options that are unique to each address. Output for any given address can be sent
directly to bitcoin.tax, saved as a CSV, or both.

## Installing NodeJS

First, install NodeJS on your system.

#### Ubuntu

The best way to install Node on Ubuntu is with [Node Version Manager (NVM)](https://github.com/creationix/nvm):

```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
```

Then:

```
nvm install --lts
```

#### MacOS

Visit the NodeJS website to download in the installer package:
https://nodejs.org/en/#download

Alternatively, if you have Homebrew installed:

```
brew install node
```

## Installing Factoid Address Monitor Daemon

Clone the repo into your target directory. Then, navigate into the project
folder and type:

```
npm install
```

## Running

Once installed, make a copy of the config.json.copy

```
cp config.json.copy config.json
```

Next, fill in config.json. This can be done in any text editor. It is crucial that the
file must be valid JSON. The script will check it is valid before running, but there are
also online tools that can help you if you get stuck.

First, fill out the location of your factomd node. Default is localhost on port 8088.

```
 "factomdConfig": {
    "host": "localhost",
    "port": 8088
},
```

Next, fill out the options for each address that you want to monitor. There are three example
address blocks. You can add more, but any example blocks that are unused should be removed from
the file. Here is an example address block:

```
{
    "address": "FAxxxx",                <-- address you want to monitor
    "currency": "USD",                  <-- target fiat currency
    "nickname": "Business",             <-- address nickname
    "saveToCsv": true,                  <-- true if you want to create a csv for this address, false otherwise
    "saveToBitcoinTax": true,           <-- true if you want to bitcoin.tax for this address, false otherwise
    "bitcoinTaxKey": "aaaa",            <-- bitcoin tax api key, only necessary if saveToBitcoinTax is true
    "bitcoinTaxSecret": "xxxx",         <-- bitcoin tax api secret, only necessary if saveToBitcoinTax is true
    "recordCoinbaseReceipts": true,     <-- true if you want to record coinbase transactions to this address
    "recordNonCoinbaseReceipts": false  <-- true if you want to record non-coinbase transactions to this address
}
```

The options are unique for each address. You can have multiple addresses pointing to the same
bitcoin.tax account, or they can all point to different accounts. Additionally, you can ignore bitcoin.tax entirely
and have it only output a csv file. All CSV files will be given the nickname specified in the address block,
and will be located in the csv folder inside the project root directory.

Make sure there is a comma between each address block, but no comma after the final address block.

### Without PM2

First, make sure factomd is running on your target host, then run.

```
node index.js
```

### With PM2

First, you must install PM2:

```
npm install pm2 -g
```

(Note: If you did not install node using NVM, you will need to run the above command with root permissions)

#### Starting

If you are monitoring a remote host, make sure factomd is running
on that host. If you are running factomd on the localhost and do
not already have factomd running as a service, you can
start it in PM2:

```
pm2 start factomd
```

Then, start Factoid Address Monitord using the following command:

```
pm2 start index.js --name monitord
```

Next, save the current process list:

```
pm2 save
```

Finally, to make sure PM2 starts with its current programmes on boot:

```
pm2 startup
```

then follow the onscreen instructions.

## Important Notes on Use and Price Data (please read)

### Price

There is no definitive price for any cryptocurrency. Instead, cryptocurrencies
trade on multiple exchanges, which means each exchange has its own price.

This creates a discrepancy between price aggregators depending on which
exchanges they use. For example, CoinMarketCap gets the price of FCT from 7
different exchanges, including an exchange in China that non-Chinese people are
unlikely to use. CryptoCompare, on the other hand, uses only 5 exchanges, and
does not at the time of writing include the aforementioned Chinese exchange.

The result is that the price can sometimes vary dramatically between the two
aggregators. Which price is accurate? The aggregator with more exchanges, or
the aggregator with exchanges that you as a user can actually access to sell
your FCT? The answer is not necessarily clear.

To give you as much control as possible over prices, we have included the -b
and -f options, which will allow you to specify which CryptoCompare exchanges
to use for both the price of FCT in BTC, and the price of BTC in your target
fiat currency. Available exchanges can be found on
[CryptoCompare.com](https://www.cryptocompare.com/). If you do not include
these options, the price will default to CryptoCompare's aggregate of all
listed exchanges.

Finally, Factoid Address Monitord does have the ability to get prices in any fiat currency
where CryptoCompare reports a market in BTC. However, unless your chosen
currency has a reasonably large volume of trade, it may not necessarily be wise
to exploit that feature. For example, CryptoCompare report that Norwegian Krone
(NOK) only trades on LocalBitcoins.com, which is notoriously expensive.
Realistically, people accounting against NOK would sell their wares on Bitstamp
then convert EUR into NOK at a much better rate. Therefore, they may achieve
greater price precision by using factoid-address-monitord with EUR and
converting to NOK manually at the last step.

## Authors

-   **Alex Carrithers for Factoshi**

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE)
file for details

## Warning

Use of this software is entirely at your own risk. It is an alpha release and
is likely to contain bugs. Any data it produces may be inaccurate or
incomplete.
