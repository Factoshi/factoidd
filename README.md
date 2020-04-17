# Factoidd

Fatoidd tracks factoid receipts in a fiat currency of your choice. Factoidd will output a CSV and, optionally, will also push transactions to the cryptocurrency accounting website bitcoin.tax. Factoidd listens for new receipts and will backfil historical receipts to a block height of your choice.

## Requirements

-   **Node.js**.
    Installation instructions: https://nodejs.org/en/download/package-manager/
-   **A Cryptocompare API key**. Get your key here: https://min-api.cryptocompare.com/. There is a free tier.
-   **Optional: a bitcoin.tax account**. Referall signup link: https://bitcoin.tax/r/3DJmuGLt

## Installation

Clone this repo and cd into the project.

```
https://github.com/Factoshi/factoidd.git
cd factoidd
```

Next, install the project dependencies and build from the source code.

```
npm install --production
npm run build
```

Optionally, you can symlink it into your PATH and setup a systemd service file. Tested on Ubuntu.

```
# symlink the entry script into your path
sudo ln -s $PWD/factoidd /usr/local/bin

# symlink the service file into systemd
sudo ln -s $PWD/factoidd.service /etc/systemd/system
```

## Running

The first time you run the script, you will need to initialise the config. Note: if you did not copy the script into you path, you will need to prefix the below commands with `./`)

```
factoidd init
```

After that, you can simply start it with

```
factoidd start
```
