![Factoidd CI](https://github.com/Factoshi/factoidd/workflows/Factoidd%20CI/badge.svg)

# Factoidd

Fatoidd tracks factoid receipts in a fiat currency of your choice. Factoidd will output a CSV and, optionally, will also push transactions to the cryptocurrency accounting website bitcoin.tax. Factoidd listens for new receipts and will backfil historical receipts to a block height of your choice.

## Installation

Factoidd is designed to work with both Systemd and Docker.

-   [Systemd instructions](./SYSTEMD.md)
-   [Docker instructions](./DOCKER.md)

## Note

It may take some time for transactions to appear on Bitcoin.tax and/or in your CSV file during the first sync. That is because Factoidd collects a complete transaction history
and fetches price data before recording any of the transactions to either of those two locations.
