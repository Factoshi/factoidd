const { resolve } = require('path');
const dotenv = require('dotenv');

// Load environment variables.
const envFile = process.env.ENV_FILE || 'develop';
const result = dotenv.config({
    path: resolve(__dirname, `${envFile}.env`),
});
if (result.error) {
    console.log('No env file.');
}
