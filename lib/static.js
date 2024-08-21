const path = require('path');
const koaStatic = require('koa-static');

function setupStatic(staticDir) {
  if (!staticDir) throw new Error('staticDir is required');
  return koaStatic(path.join(process.cwd(), staticDir));
}

module.exports = setupStatic;
