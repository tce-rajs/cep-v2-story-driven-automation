// Local server for CEP v2 ClassMap Runner.
// Allows the web dashboard to directly execute tests on your local machine with 1 click,
// streaming live terminal logs back to the browser in real time.
//
// Usage:
//   node scripts/server-classmap.js
//   npm run classmap

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const PORT = process.env.CLASSMAP_PORT || 3456;
const ROOT = path.join(__dirname, '..');
const HTML_FILE = path.join(ROOT, 'report', 'CLASS_MAP.html');

let currentTestProcess = null;

// Rebuild HTML page on start to ensure latest config
try {
  require('./build-classmap-page');
} catch (e) {
  console.warn('Could not auto-rebuild classmap page:', e.message);
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Serve main UI
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    if (fs.existsSync(HTML_FILE)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(HTML_FILE).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('CLASS_MAP.html not found. Run npm run classmap:page first.');
    }
    return;
  }

  // 2. Health check
  if (req.method === 'GET' && req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ready',
        isRunning: !!currentTestProcess,
      })
    );
    return;
  }

  // 3. Stop running test
  if (req.method === 'POST' && req.url === '/api/stop') {
    if (currentTestProcess) {
      try {
        if (process.platform === 'win32') {
          exec(`taskkill /pid ${currentTestProcess.pid} /T /F`);
        } else {
          currentTestProcess.kill('SIGTERM');
        }
      } catch (err) {
        console.warn('Error killing process:', err.message);
      }
      currentTestProcess = null;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ stopped: true }));
    return;
  }

  // 4. Directly Run Test with Streaming Logs
  if (req.method === 'POST' && req.url === '/api/run') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      let params = {};
      try {
        params = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        return;
      }

      if (currentTestProcess) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'A test is already running. Please wait or stop it first.' }));
        return;
      }

      // Setup Server-Sent Events (SSE) streaming response
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const sendEvent = (type, data) => {
        res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
      };

      const runnerArgs = [path.join(ROOT, 'scripts', 'run-with-class.js'), `--module=${params.module || 'default'}`];

      if (params.grade) runnerArgs.push(`--grade=${params.grade}`);
      if (params.division) runnerArgs.push(`--division=${params.division}`);
      if (params.subject) runnerArgs.push(`--subject=${params.subject}`);
      if (params.pin) runnerArgs.push(`--pin=${params.pin}`);
      if (params.headed) runnerArgs.push('--headed');

      sendEvent('start', {
        module: params.module,
        class: `${params.grade || 'Default'} ${params.division || ''} | ${params.subject || ''}`,
        pin: params.pin,
        command: `node ${runnerArgs.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`,
      });

      const child = spawn(process.execPath, runnerArgs, {
        cwd: ROOT,
        env: { ...process.env },
        shell: false,
      });

      currentTestProcess = child;

      child.stdout.on('data', (data) => {
        sendEvent('log', { text: data.toString() });
      });

      child.stderr.on('data', (data) => {
        sendEvent('log', { text: data.toString(), error: true });
      });

      child.on('close', (code) => {
        currentTestProcess = null;
        sendEvent('done', {
          code,
          success: code === 0,
        });
        res.end();
      });

      child.on('error', (err) => {
        currentTestProcess = null;
        sendEvent('error', { message: err.message });
        res.end();
      });

      req.on('close', () => {
        if (currentTestProcess === child) {
          try {
            if (process.platform === 'win32') {
              exec(`taskkill /pid ${child.pid} /T /F`);
            } else {
              child.kill();
            }
          } catch {
            // Process may already have terminated
          }
          currentTestProcess = null;
        }
      });
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('====================================================');
  console.log(' CEP v2 ClassMap Runner — Live Server Active');
  console.log(` Web Dashboard: ${url}`);
  console.log(' Click "▶ Run" on any module to run directly!');
  console.log('====================================================');

  // Automatically open browser on launch
  const openCmd = process.platform === 'win32' ? `start ${url}` : `open ${url}`;
  exec(openCmd, () => {});
});
