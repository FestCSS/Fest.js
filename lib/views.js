const path = require('path');
const ejs = require('koa-ejs');

function setupViews(app, viewsDir) {
  ejs(app, {
    root: path.join(__dirname, '../', viewsDir),
    layout: false,
    viewExt: 'ejs',
    cache: false
  });
}

module.exports = setupViews;
