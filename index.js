const fs = require('fs-extra');
const path = require('path');
const parser = require('raml-1-parser');
const arcRaml2obj = require('raml2obj');
const Koa = require('koa');
const static = require('koa-static');
const WebSocket = require('ws');
const chokidar = require('chokidar');
const mount = require('koa-mount');

function parse(file) {
    return parser.loadApi(file)
        .then(api => {
            if ('expand' in api) {
                api = api.expand(true);
            }
            let json = api.toJSON({
                dumpSchemaContents: false,
                rootNodeDetails: true,
                serializeMetadata: false
            });
            let namespace = json.type;
            json = json.specification;
            json.namespace = namespace;
            return json;
        })
        .then(json => arcRaml2obj.parse({ json }))
        .then(data => data.json);
}

function watch(file, cb) {
    function fire(data) {
        cb(JSON.stringify(data));
    }
    function compile() {
        fire({ payload: 'loading' });
        console.log('Generating JSON.');
        return parse(file).then(data => {
            console.log('Generate Finished.');
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
    const compile = parse(file);
    Promise.all([compile, copyFiles]).then(([data]) => {
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