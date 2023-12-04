#! /usr/bin/env node
const { program } = require('commander');
const inscriptions = require('./commands/inscriptions.js')
const wallet = require('./commands/wallet.js')
const sweep = require('./commands/sweep.js')
process.noDeprecation = true;
program.addCommand(inscriptions);
program.addCommand(wallet);
program.addCommand(sweep);

program.parse(process.argv);