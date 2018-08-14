const path = require('path');
const serve = require('../index');

serve(path.join(__dirname, 'test.raml'), { port: 3000 });