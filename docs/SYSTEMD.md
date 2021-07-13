# Systemd

Instructions to run Factoidd with Systemd.

## Requirements

-   **Node.js v12 or higher**.
    Installation instructions: https://nodejs.org/en/download/package-manager/
-   **A Cryptocompare API key**. Get your key here: https://min-api.cryptocompare.com/. There is a free tier.
-   **Optional: a bitcoin.tax account**. Referral signup link: https://bitcoin.tax/r/3DJmuGLt

## Installation

Clone this repo and cd into the project.

```bash
git clone https://github.com/Factoshi/factoidd.git && cd factoidd
```

Install dependencies.

```bash
npm install --production
```

Compile the source code.

```bash
npm run build
```

## Initialise

Create a copy of the example config and fill out it out with your own values.

```bash
cp config/config.yml.EXAMPLE config/config.yml
nano config/config.yml
```

## Run

```bash
./factoidd
```

## Systemd

These instructions were tested on Ubuntu 18.04 and may need to be adapted.

Symlink factoidd into your PATH.

```bash
sudo ln -s $PWD/factoidd /usr/local/bin
```

Create the factoidd service file.

```bash
# copy the example service file
cp config/factoidd.service.example config/factoidd.service

# edit the factoidd.service file to add your user and make any oher changes
nano factoidd.service

# symlink the service file into the systemd directory
sudo ln -s $PWD/factoidd.service /etc/systemd/system/
```

Start the factoidd service.

```bash
sudo systemctl start factoidd.service
```
