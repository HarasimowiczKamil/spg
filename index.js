global._und = require('underscore')._;
global.log = require('node-simple-log').log;
global.appRoot = process.argv[1].match(/(.*\/)[^\/]+$/)[1];

var app = require('./lib/Application.js');

log('Root path:', appRoot);

app.run(process.argv.slice(2));