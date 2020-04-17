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

```bash
git clone https://github.com/Factoshi/factoidd.git && cd factoidd
```

Install the project dependencies and build from the source code.

```bash
npm install --production
```

Compile the source code.

```bash
npm run build
```

Optionally, you can symlink it into your PATH and setup a systemd service file. Tested on Ubuntu.

```bash
# symlink the entry script into your PATH
sudo ln -s $PWD/factoidd /usr/local/bin

# create a systemd service file. Edit the below example as needed
echo "[Unit]
Description=factoidd - track factoid transactions
Documentation=https://github.com/Factoshi/factoidd
After=network.target

[Service]
User=$USER
Environment=NODE_ENV=production
Environment=ENV_FILE=production
Type=simple
ExecStart=/usr/local/bin/factoidd start
Restart=on-failure

[Install]
WantedBy=multi-user.target" > /etc/systemd/system/factoidd.service
```

## Running

### Init

The first time you run the script, you will need to initialise the config.

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
