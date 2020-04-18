# Docker

Instructions to run Factoidd with Docker.

## Requirements

-   **Docker**.
    Installation instructions: https://docs.docker.com/get-docker/
-   **A Cryptocompare API key**. Get your key here: https://min-api.cryptocompare.com/. There is a free tier.
-   **Optional: a bitcoin.tax account**. Referral signup link: https://bitcoin.tax/r/3DJmuGLt

## Running

Create a volume to persist Factoidd data on the host machine.

```bash
mkdir ~/.factoidd
```

### Initialise

Initialise Factoidd config. This only needs to be done once.

```bash
docker run -it -v ~/.factoidd:/root/.factoidd --rm factoshi/factoidd:latest init
```

### Start

Start Factoidd.

```bash
docker run -d \
    -v ~/.factoidd:/root/.factoidd \
    --name factoidd \
    --network="host" \
    factoshi/factoidd:latest start
```

### Spend

If you wish to execute the `spend` subcommand with Docker, you can do so with the following command:

```bash
docker run -v --rm \
    -v ~/.factoidd:/root/.factoidd \
    --network="host" \
    factoshi/factoidd:latest spend --txid [txid]
```
