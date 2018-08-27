const fs = require('fs-extra');
const path = require('path');
const Koa = require('koa');
const static = require('koa-static');
const WebSocket = require('ws');
const chokidar = require('chokidar');
const mount = require('koa-mount');
const { RamlJsonGenerator } = require('raml-json-enhance-node');

function watch(file, cb) {
    const enhancer = new RamlJsonGenerator(file, {
        prettyPrint: true
    });
    function fire(data) {
        cb(JSON.stringify(data));
    }
    function compile() {
        fire({ payload: 'loading' });
        console.log('Generating JSON.');
        return enhancer.generate().then(data => {
            console.log('Generate Finished.');
            console.log(JSON.stringify(data, '', '  '))
            fire({ payload: 'raml', data });
        }).catch(err => {
            fire({ payload: 'error', message: err.message });
            console.error('Generate Error', cause);
        });
    }
    chokidar.watch(file, { followSymlinks: true })
        .on('change', (file) => {
            console.log('File Changed: ', path.relative(process.cwd(), file));
            compile();
        });
    compile();
}

function serve(file, options = {}) {
    const app = new Koa();
    app.use(mount('/', static(path.join(__dirname, 'build', 'default'))), { defer: true });

    const server = app.listen(options.port || 8000, () => {
        console.log(`server start at port ${options.port || 8000}`)
    });

    const wss = new WebSocket.Server({ server });

    wss.broadcast = function broadcast(data) {
        wss.clients.forEach(client => (client.readyState === WebSocket.OPEN) && client.send(data));
    };

    let cache = undefined;

    watch(file, data => {
        cache = data;
        wss.broadcast(data);
    });

    wss.on('connection', socket => cache && socket.send(cache));
}
module.exports = serve;

function build(file, target = 'build') {
    const copyFiles = fs.copy(path.join(__dirname, 'build', 'default'), target);
    const compile = new RamlJsonGenerator(file, {
        prettyPrint: true
    }).generate();
    return Promise.all([compile, copyFiles]).then(([data]) => {
        const content = `
        window.addEventListener('WebComponentsReady', function () {
            document.title = "${data.title}";
            document.querySelector('api-console').raml = ${JSON.stringify(data)};
        });
        `;
        fs.outputFile(path.join(target, 'static', 'watcher.js'), content);
    });
}

module.exports.build = build;