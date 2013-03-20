global._und = require('underscore')._;
global.log = require('node-simple-log').log;
global.appRoot = process.cwd();

var app = require('./lib/Application.js');

log('Root path:', appRoot);

app.run(process.argv.slice(2));