module.exports = {
    apps: [
        {
            name: 'factoidd',
            script: 'factoidd.js',
            args: 'one two',
            instances: 1,
            autorestart: false,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development',
                ENV_FILE: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
                ENV_FILE: 'production',
            },
        },
    ],
};
