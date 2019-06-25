# Factoidd

Fatoidd tracks factoid receipts in a fiat currency of your choice. Factoidd will output a CSV and, optionally, will also push transactions to the cryptocurrency accounting website https://bitcoin.tax. Factoidd listens for new receipts and will backfil historical receipts to a block height of your choice.

Factoidd can be pulled directly from Docker Hub and run as a container. It also works well as a standalone daemon, or can be run as needed to fill missing transactions.

## Requirements

-   A Cryptocompare API key. Get your key here: https://min-api.cryptocompare.com/. There is a free tier.
-   Either Docker or a recent version of Node.js.
-   Optional: a bitcoin.tax account.

## Installation

### Docker (recommended)

Set up the directory structure on your host machine.

```
mkdir factoidd && cd factoidd
mkdir config && mkdir database
```

Next, create a config.yaml file and place it in the config directory. An example configuration file can be found [here](config/config.EXAMPLE.yaml).

When you're done, your directory structure should look like this:

```
├── factoidd
│   ├── config
│   │   └─ config.yaml
│   └── database
└── ...
```

Finally, pull the image and create a container. Check you have the latest version [here](https://cloud.docker.com/u/factoshi/repository/docker/factoshi/factoidd/tags).

```
docker run -d --name factoidd \
    -v /path/to/your/factoidd/config:/app/config \
    -v /path/to/your/factoidd/database:/app/database \
    factoshi/factoidd:v3.0.0-alpine
```

Check your docker logs to make sure factoidd is configured correctly.

### Node.js

Clone this repo and cd into the project.

```
https://github.com/Factoshi/factoidd.git
cd factoidd
```

Create a config file and place it in the config directory. An example config is already in place, or you can view it [here](config/config.yaml.example).

Next, install the project dependencies and build from the source code.

```
npm install --production
npm run build
```

And that's it. Run the daemon with:

```
node factoidd
```

If you want to run factoidd as a background process, you may consider using [PM2](http://pm2.keymetrics.io/) or systemd.

## Development

No special configuration needed for development. Tests can be run with:

```
npx jest
```
