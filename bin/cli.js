#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const commander = require("commander");
const chalk = require('chalk');
const packageJson = require("../package.json");
const serve = require('../index');

commander
    .command('serve <raml-file>')
    .usage(`${chalk.green('<raml-file>')} [options]`)
    .option('-p, --port [port]', 'server port')
    .action((file, { port }) => {
        const p = path.resolve(file);
        if (!fs.existsSync(file)) {
            console.log(chalk.red('File not exist: ' + file));
            process.exit(-1);
        }
        serve(p, { port });
    })

commander.command('build <raml-file>')
    .usage(`${chalk.green('<raml-file>')} `)
    .option('-t, --target [target]', 'output location')
    .action((file, { target }) => {
        const p = path.resolve(file);
        if (!fs.existsSync(file)) {
            console.log(chalk.red('File not exist: ' + file));
            process.exit(-1);
        }
        serve.build(p, path.resolve(target || 'out'));
    })

const program = commander.version(packageJson.version)
    .allowUnknownOption()
    .parse(process.argv);

if (program.args.length === 0) {
    program.help();
    return;
}
