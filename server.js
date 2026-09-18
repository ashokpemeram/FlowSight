const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.env.PORT) || 3000;
const siteDirectory = path.join(__dirname, 'dist');
const predictionUrl = 'https://traffic-volume-prediction.onrender.com/predict';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readRequestBody(request) {
  const chunks = [];
  let length = 0;

  for await (const chunk of request) {
    length += chunk.length;
    if (length > 50_000) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/api/predict') {
    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Only POST requests are allowed.' });
      return;
    }

    try {
      const body = await readRequestBody(request);
      const predictionResponse = await fetch(predictionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(45_000)
      });
      const responseBody = await predictionResponse.text();

      response.writeHead(predictionResponse.status, {
        'Content-Type': predictionResponse.headers.get('content-type') || 'application/json; charset=utf-8'
      });
      response.end(responseBody);
    } catch (error) {
      sendJson(response, 502, {
        error: 'The prediction service could not be reached. Please try again in a moment.'
      });
    }
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: 'Method not allowed.' });
    return;
  }

  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.resolve(siteDirectory, `.${requestedPath}`);

  if (!filePath.startsWith(siteDirectory + path.sep)) {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }

  const fallbackFile = path.join(siteDirectory, 'index.html');
  const responseFile = fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory() ? filePath : fallbackFile;
  if (!fs.existsSync(responseFile)) {
    sendJson(response, 503, { error: 'Frontend build not found. Run npm run build first.' });
    return;
  }

  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(responseFile)] || 'application/octet-stream' });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  fs.createReadStream(responseFile).pipe(response);
});

server.listen(port, () => {
  console.log(`Traffic Predictor is running at http://localhost:${port}`);
});
