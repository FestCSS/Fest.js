const path = require('path');
const fs = require('fs');
const Koa = require('koa');
const Router = require('koa-router');
const ejs = require('koa-ejs');
const chokidar = require('chokidar');
const http = require('http');
const { minify } = require('html-minifier');

const streamToString = (stream) => {
  return new Promise((resolve, reject) => {
    let data = '';
    stream.on('data', chunk => data += chunk);
    stream.on('end', () => resolve(data));
    stream.on('error', reject);
  });
};

const errorHandlingMiddleware = async (ctx, next) => {
  try {
    await next();
    if (ctx.status === 404) {
      ctx.type = 'html';
      ctx.body = fs.existsSync(path.join(config.pagesDir, '404.ejs'))
        ? fs.createReadStream(path.join(config.pagesDir, '404.ejs'))
        : 'Page not found';
    } else if (ctx.status === 500) {
      ctx.type = 'html';
      ctx.body = fs.existsSync(path.join(config.pagesDir, '500.ejs'))
        ? fs.createReadStream(path.join(config.pagesDir, '500.ejs'))
        : 'Internal Server Error';
    }
  } catch (err) {
    console.error('Error:', err);
    ctx.status = err.status || 500;
    ctx.body = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          body { background-color: #f8d7da; color: #721c24; font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h1 { font-size: 2rem; }
          p { font-size: 1rem; }
        </style>
      </head>
      <body>
        <h1>Oops! Something went wrong.</h1>
        <p>${err.message}</p>
        <p>Status Code: ${ctx.status}</p>
      </body>
      </html>
    `;
  }
};

const configPath = path.resolve(process.cwd(), 'fest.config.js');
const tsConfigPath = path.resolve(process.cwd(), 'fest.config.ts');
let config;

if (fs.existsSync(configPath)) {
  config = require(configPath);
} else if (fs.existsSync(tsConfigPath)) {
  config = require(tsConfigPath);
} else {
  throw new Error('Configuration file fest.config.js or fest.config.ts is missing.');
}

if (!config.staticDir || !config.pagesDir) {
  throw new Error('Both staticDir and pagesDir must be specified in the configuration file.');
}

function createApp({ staticDir = 'public', pagesDir = 'pages', useFestUI = false }) {
  const app = new Koa();
  const server = http.createServer(app.callback());

  app.use(errorHandlingMiddleware);

  ejs(app, {
    root: path.resolve(process.cwd(), pagesDir),
    layout: false,
    viewExt: 'ejs',
    cache: false
  });

  app.use(require('koa-static')(path.resolve(process.cwd(), staticDir)));

  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    const metaRefreshMiddleware = require('../middleware/metaRefreshMiddleware');
    const metaRefresh = metaRefreshMiddleware({ checkInterval: 5000 });
    app.use(metaRefresh);
  }

  if (useFestUI) {
    app.use(async (ctx, next) => {
      await next();
      
      if (ctx.response.is('html')) {
        if (typeof ctx.body === 'string') {
          ctx.body = ctx.body.replace(/<\/head>/, '<link rel="stylesheet" href="/css/main.css"></head>');
          ctx.body = ctx.body.replace(/<\/body>/, '<script src="/js/main.js"></script></body>');
          ctx.body = minify(ctx.body, {
            removeComments: true,
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true
          });
        } else if (ctx.body && ctx.body.pipe) {
          const bodyString = await streamToString(ctx.body);
          ctx.body = bodyString.replace(/<\/head>/, '<link rel="stylesheet" href="/css/main.css"></head>');
          ctx.body = ctx.body.replace(/<\/body>/, '<script src="/js/main.js"></script></body>');
          ctx.body = minify(ctx.body, {
            removeComments: true,
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true
          });
        }
      }
    });
  }

  app.use(async (ctx, next) => {
    const staticFilePath = path.join(staticDir, `${ctx.path === '/' ? 'index' : ctx.path}.html`);
    if (fs.existsSync(staticFilePath)) {
      ctx.type = 'html';
      ctx.body = fs.createReadStream(staticFilePath);
    } else {
      await next();
    }
  });

  const router = new Router();
  const setupRoutes = require('./router');
  setupRoutes(router, path.resolve(process.cwd(), pagesDir));

  app.use(async (ctx, next) => {
    await next();
    if (ctx.response.is('html') && !ctx.body.includes('<!DOCTYPE html>')) {
      const viewPath = path.join(process.cwd(), config.pagesDir, `${ctx.path === '/' ? 'index' : ctx.path}.ejs`);
      if (fs.existsSync(viewPath)) {
        const body = ctx.body;
        ctx.body = ejs.renderFileSync(path.join(process.cwd(), config.pagesDir, '_layout.ejs'), {
          body
        });
      }
    }
  });

  app.use(router.routes());

  chokidar.watch(path.resolve(process.cwd(), pagesDir)).on('all', (event, filePath) => {
    if (event === 'add' || event === 'change' || event === 'unlink') {
      console.log(`Detected ${event} on ${filePath}`);
      if (require.cache[filePath]) {
        delete require.cache[filePath];
      }
      setupRoutes(router, path.resolve(process.cwd(), pagesDir));
      console.log('Routes updated');
    }
  });

  return { app, server };
}

async function generateStaticPages(config) {
  const pagesDir = path.resolve(process.cwd(), config.pagesDir || 'pages');
  const outputDir = path.resolve(process.cwd(), 'out');
  const pages = fs.readdirSync(pagesDir).filter(file => file.endsWith('.ejs'));

  for (const page of pages) {
    const filePath = path.join(pagesDir, page);
    const outputFilePath = path.join(outputDir, page.replace('.ejs', '.html'));

    try {
      const html = await new Promise((resolve, reject) => {
        ejs.renderFile(filePath, config, {}, (err, str) => {
          if (err) reject(err);
          else resolve(str);
        });
      });

      fs.writeFileSync(outputFilePath, html, 'utf8');
      console.log(`Generated static page: ${outputFilePath}`);
    } catch (error) {
      console.error(`Error rendering page ${filePath}:`, error);
    }
  }
}

module.exports = { createApp, generateStaticPages };

if (require.main === module) {
  const { staticDir, pagesDir } = config;
  generateStaticPages({ staticDir, pagesDir }).then(() => {
    console.log('Static site generation completed');
  });
}
