const { fullStack } = require('make-error-cause')

try {
  require('./src/init');
  require('./src');
} catch (err) {
  console.log(fullStack(err))
  process.exit(1)
}
