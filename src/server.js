import http from 'node:http';
import { status } from './service.js';
import { renderStatusPage } from './serviceCard.js';

// Without an explicit DEPLOYED_AT, treat process start as the deployment time.
const deployedAt = process.env.DEPLOYED_AT || new Date().toISOString();
const environment = process.env.DEPLOY_ENV || 'local';

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(status()));
  } else if (pathname === '/') {
    const { service, version } = status();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(renderStatusPage([{ name: service, environment, version, deployedAt }]));
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Not found');
  }
}).listen(Number(process.env.PORT || 8080), '0.0.0.0');
