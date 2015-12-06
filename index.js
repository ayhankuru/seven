require('babel-core/register')({ ignore: false,only: /lib/}); 
module.exports = require('./lib/seven');
