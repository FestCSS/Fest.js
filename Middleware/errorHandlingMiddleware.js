const path = require('path');
const fs = require('fs');
const ejs = require('koa-ejs');

// Error handling middleware
const errorHandlingMiddleware = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    // Handle errors during request processing
    ctx.status = err.status || 500;
    if (ctx.status === 404) {
      const custom404Path = path.join(process.cwd(), config.pagesDir, '404.ejs');
      if (fs.existsSync(custom404Path)) {
        ctx.type = 'html';
        ctx.body = fs.createReadStream(custom404Path);
      } else {
        ctx.body = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>404 Not Found</title>
          </head>
          <body>
            <h1>404 Not Found</h1>
            <p>The page you are looking for does not exist.</p>
          </body>
          </html>
        `;
      }
    } else if (ctx.status === 500) {
      const custom500Path = path.join(process.cwd(), config.pagesDir, '500.ejs');
      if (fs.existsSync(custom500Path)) {
        ctx.type = 'html';
        ctx.body = fs.createReadStream(custom500Path);
      } else {
        ctx.body = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>500 Internal Server Error</title>
          </head>
          <body>
            <h1>500 Internal Server Error</h1>
            <p>Something went wrong on our end. Please try again later.</p>
          </body>
          </html>
        `;
      }
    } else {
      ctx.body = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error</title>
        </head>
        <body>
          <h1>${err.message}</h1>
          <p>Status Code: ${ctx.status}</p>
        </body>
        </html>
      `;
    }
    ctx.app.emit('error', err, ctx);
  }
};


module.exports = errorHandlingMiddleware;
