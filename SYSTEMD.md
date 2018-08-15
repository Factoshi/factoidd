# Running factoid-address-monitord with systemd
You can use the provided systemd service file to have systemd manage and run
this program for you.

## Config
You will need to edit this file to work on your system.

### NODE_PATH
You must edit this line so that it specifies the correct node path. This could
just be the `node_modules` directory inside which you cloned this project ran
`npm install` inside of earlier. Alternatively, it could be the global
`node_modules` directory for your system.
```
Environment="NODE_PATH=/usr/lib/node_modules/"
```
### ExecStart
You must edit this line so that it specifies the correct entry point for the
script. Again, this could just be the path where you cloned this project.  If
the dependencies were installed globally and you copied the script to
`/usr/bin` it would look like this.
```
ExecStart=/usr/bin/factoid-address-monitord --address %I --file /var/db/factoid-address-monitord/%I.csv $FACTOID_ADDRESS_MONITORD_OPTS
```

### Output directory
The unit uses the public Factoid address as the name of the CSV file where it
stores the transaction history. By default the path is
`/var/db/factoid-address-monitord/`.
**You must create this directories before starting the service.**
The path can be changed by editing the `ExecStart` line above.

### Additional options
To pass additional CLI options you can create a file
`/etc/default/factoid-address-monitord` with the environment variable
`FACTOID_ADDRESS_MONITORD_OPTS` like this:
```
FACTOID_ADDRESS_MONITORD_OPTS="--currency USD --key xxxxxxxxx --secret xxxxxxxxxxxxxxx"
```

### Install
```
cp /path/to/factoid-address-monitord.defaults /etc/default/factoid-address-monitord
cp /path/to/factoid-address-monitord@.service /etc/systemd/system/
systemctl daemon-reload
mkdir -p /var/db/factoid-address-monitord/
```

## Starting
You of course still need to have factom-walletd and factomd set up and running.
```
systemctl start factoid-address-monitord@FA2efw5fsufKusByeBVa6gZERKV9X5LJN3wKcazndTQNFAePRrft
systemctl status factoid-address-monitord@FA2efw5fsufKusByeBVa6gZERKV9X5LJN3wKcazndTQNFAePRrft
```
For full logs use `journalctl -xeu factoid-address-monitord@FA2efw5fsufKusByeBVa6gZERKV9X5LJN3wKcazndTQNFAePRrft`.

