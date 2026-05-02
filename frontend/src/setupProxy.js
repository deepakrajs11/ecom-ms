const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  app.use(
    ['/api/auth', '/api/users'],
    createProxyMiddleware({
      changeOrigin: true,
      target: 'http://localhost:8081',
    })
  );

  app.use(
    '/api/products',
    createProxyMiddleware({
      changeOrigin: true,
      target: 'http://localhost:8080',
    })
  );

  app.use(
    '/api/cart',
    createProxyMiddleware({
      changeOrigin: true,
      target: 'http://localhost:8082',
    })
  );
};
