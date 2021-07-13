# Docker

Instructions to run Factoidd with Docker.

## Requirements

-   **Docker**.
    Installation instructions: https://docs.docker.com/get-docker/
-   **A Cryptocompare API key**. Get your key here: https://min-api.cryptocompare.com/. There is a free tier.
-   **Optional: a bitcoin.tax account**. Referral signup link: https://bitcoin.tax/r/3DJmuGLt

## Initialise

Create volumes to persist data on the host machine.

```bash
mkdir -p ~/.factoidd/config
mkdir ~/.factoidd/data
```

Grab the example config.

```bash
wget https://raw.githubusercontent.com/Factoshi/factoidd/config/config.yml.EXAMPLE -P ~/.factoidd/config
```

Create a copy of the example config and fill out it out with your own values.

```bash
cp ~/.factoid/config/config.yml.EXAMPLE ~/.factoid/config/config.yml
nano ~/.factoid/config/config.yml
```

## Run

Start Factoidd.

```bash
docker run -d \
    -v ~/.factoidd/config:/etc/factoidd \
    -v ~/.factoidd/data:/var/lib/factoidd \
    --name factoidd \
    factoshi/factoidd:latest
```
