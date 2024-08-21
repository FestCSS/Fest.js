const path = require('path');
const fs = require('fs');

module.exports = function metaRefreshMiddleware(options) {
  const { checkInterval = 5000 } = options || {};

  return async (ctx, next) => {
    try {
      await next();

      if (ctx.response.is('html')) {
        let body = ctx.body;

        if (typeof body === 'string') {
          const metaRefresh = `<meta http-equiv="refresh" content="${checkInterval / 1000}">`;
          body = body.replace(/<\/head>/, `${metaRefresh}</head>`);

          const overlayHtml = `
            <style>
              .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 50px;
                background-color: rgba(0, 0, 0, 0.7);
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                display: none;
              }
              .loading-overlay.show {
                display: flex;
              }
              .error-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                display: none;
                flex-direction: column;
                padding: 20px;
              }
              .error-overlay.show {
                display: flex;
              }
              .error-message {
                font-size: 16px;
                text-align: center;
                max-width: 800px;
                overflow: auto;
              }
              .error-message pre {
                white-space: pre-wrap;
                word-wrap: break-word;
              }
            </style>
            <div class="loading-overlay" id="loadingOverlay">
              <div>Loading...</div>
            </div>
            <div class="error-overlay" id="errorOverlay">
              <div class="error-message">
                <h2>An error occurred</h2>
                <pre id="errorDetails"></pre>
              </div>
            </div>
            <script>
              document.addEventListener('DOMContentLoaded', function() {
                const overlay = document.getElementById('loadingOverlay');
                overlay.classList.add('show');
                window.addEventListener('load', function() {
                  overlay.classList.remove('show');
                });
              });

              window.addEventListener('error', function(event) {
                const errorOverlay = document.getElementById('errorOverlay');
                const errorDetails = document.getElementById('errorDetails');
                errorOverlay.classList.add('show');
                errorDetails.textContent = event.message || 'An unknown error occurred';
              });
            </script>
          `;

          body = body.replace(/<\/body>/, `${overlayHtml}</body>`);
          ctx.body = body;
        }
      }
    } catch (err) {
      // Capture error and add error overlay
      ctx.status = 500;
      ctx.body = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <style>
            body {
              background-color: #0B2447;
              color: #fff;
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .error-overlay {
              background-color: rgba(0, 0, 0, 0.8);
              color: #fff;
              padding: 20px;
              border-radius: 5px;
              max-width: 800px;
              width: 100%;
              text-align: center;
            }
            .error-overlay pre {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <div class="error-overlay">
            <h1>An error occurred</h1>
            <pre>${err.stack || err.message}</pre>
          </div>
        </body>
        </html>
      `;
    }
  };
};
