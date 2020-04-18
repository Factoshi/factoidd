# Systemd

Instructions to run Factoidd with Systemd.

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

Symlink Factoidd into your PATH.

```bash
sudo ln -s $PWD/factoidd /usr/local/bin
```

Now set up systemd. These instructions were tested on Ubuntu 18.04 and may need to be adapted.

```bash
# copy the example service file
cp factoidd.service.example factoidd.service

# edit the factoidd.service file to add your user and make any oher changes
nano factoidd.service

# symlink the service file into the systemd directory
sudo ln -s $PWD/factoidd.service /etc/systemd/system/
```

## Running

### Init

The first time you run the script, you will need to initialise the config.

```
factoidd init
```

### Start

You can backfill all historical income transctions and listen for new income transactions using the `start` subcommand. This command will run indefinitely.

```bash
sudo systemctl start factoidd
```

### Spend

You can add an individual spend transactions using the `spend` subcommand:

```
factoid spend <transaction ID>
```

Run `factoidd --help` for further help.
