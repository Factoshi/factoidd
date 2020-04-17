![Factoidd CI](https://github.com/Factoshi/factoidd/workflows/Factoidd%20CI/badge.svg)

# Factoidd

Fatoidd tracks factoid receipts in a fiat currency of your choice. Factoidd will output a CSV and, optionally, will also push transactions to the cryptocurrency accounting website bitcoin.tax. Factoidd listens for new receipts and will backfil historical receipts to a block height of your choice.

## Requirements

-   **Node.js**.
    Installation instructions: https://nodejs.org/en/download/package-manager/
-   **A Cryptocompare API key**. Get your key here: https://min-api.cryptocompare.com/. There is a free tier.
-   **Optional: a bitcoin.tax account**. Referral signup link: https://bitcoin.tax/r/3DJmuGLt

## Installation

Clone this repo and cd into the project.

```shell
git clone https://github.com/Factoshi/factoidd.git && cd factoidd
```

Install the project dependencies and build from the source code.

```shell
npm install --production
```

Compile the source code.

```shell
npm run build
```

Optionally, you can symlink it into your PATH and setup a systemd service file. Tested on Ubuntu.

```shell
# symlink the entry script into your PATH
sudo ln -s $PWD/factoidd /usr/local/bin

# symlink the service file into systemd
sudo ln -s $PWD/factoidd.service /etc/systemd/system
```

## Running

### Init

The first time you run the script, you will need to initialise the config. Note: if you did not copy the script into you path, you will need to prefix the below commands with `./`)

```
factoidd init
```

### Start

You can backfill all historical income transctions and listen for new income transactions using the `start` subcommand. This command will run indefinitely. You can either daemonise it (e.g. with the systemd service file symlinked above) or run it at regular intervals to backfill transactions:

```
factoidd start
```

### Spend

You can add an individual spend transactions using the `spend` subcommand:

```
factoid spend <transaction ID>
```

Run `factoidd --help` for further help.
