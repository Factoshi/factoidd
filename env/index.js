const dotenv = require('dotenv');

// Load environment variables.
const envFile = process.env.ENV_FILE || 'develop';
const result = dotenv.config({
    path: `./env/${envFile}.env`,
});
if (result.error) {
    console.log('No env file.');
}
