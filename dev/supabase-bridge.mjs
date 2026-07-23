// DEV TOOL — not shipped. A localhost → Supabase proxy for browser testing
// inside a sandboxed CI/agent environment whose headless browser can't egress
// to *.supabase.co directly (node CAN). Point the web build at this bridge:
//
//   node dev/supabase-bridge.mjs            # listens on http://localhost:8443
//   CI=1 EXPO_PUBLIC_SUPABASE_URL=http://localhost:8443 npx expo start --web --port 8081
//
// Then drive it with Playwright (see dev/README.md). On a real device / normal
// network this is unnecessary — the app talks to Supabase directly.
import http from 'node:http';
import https from 'node:https';
import WebSocket from '../node_modules/ws/index.js';

const HOST = 'gtdigidqsczptqpbplar.supabase.co';
const PORT = 8443;

const server = http.createServer((req, res) => {
  const opts = {
    hostname: HOST,
    port: 443,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: HOST },
  };
  const fwd = https.request(opts, (up) => {
    res.writeHead(up.statusCode, up.headers);
    up.pipe(res);
  });
  fwd.on('error', (e) => {
    console.error('fwd error', req.method, req.url, e.message);
    res.writeHead(502);
    res.end('bridge upstream error');
  });
  req.pipe(fwd);
});

// Realtime WebSocket bridge.
const wss = new WebSocket.Server({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (client) => {
    const upstream = new WebSocket(`wss://${HOST}${req.url}`, {
      headers: { origin: `https://${HOST}` },
    });
    const queue = [];
    let open = false;
    upstream.on('open', () => {
      open = true;
      for (const m of queue) upstream.send(m);
      queue.length = 0;
    });
    upstream.on('message', (m) => client.readyState === 1 && client.send(m));
    upstream.on('close', () => client.close());
    upstream.on('error', (e) => {
      console.error('ws upstream error', e.message);
      client.close();
    });
    client.on('message', (m) => (open ? upstream.send(m) : queue.push(m)));
    client.on('close', () => upstream.close());
    client.on('error', () => upstream.close());
  });
});

server.listen(PORT, '127.0.0.1', () =>
  console.log(`bridge listening on http://localhost:${PORT} -> https://${HOST}`),
);
