const Router = require('koa-router');
const fs = require('fs');
const path = require('path');

function setupRoutes(router, pagesDir) {
  if (!fs.existsSync(pagesDir)) {
    throw new Error(`Pages directory does not exist: ${pagesDir}`);
  }

  router.stack = [];

  fs.readdirSync(pagesDir).forEach(file => {
    const route = file === 'index.ejs' ? '/' : `/${path.basename(file, '.ejs')}`;
    const filePath = path.join(pagesDir, file);

    // Ensure file exists
    if (fs.existsSync(filePath)) {
      router.get(route, async (ctx) => {
        await ctx.render(path.basename(file, '.ejs'));
      });
    } else {
      console.warn(`File does not exist: ${filePath}`);
    }
  });
}

module.exports = setupRoutes;
