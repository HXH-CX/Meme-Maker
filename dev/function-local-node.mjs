import http from 'node:http'
import { handler } from '../functions/handler.ts'

http
  .createServer(async (req, res) => {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = Buffer.concat(chunks)
    const r = await handler(
      new Request(`http://127.0.0.1:8000${req.url}`, {
        method: req.method,
        headers: req.headers,
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
      }),
    )
    res.writeHead(r.status, Object.fromEntries(r.headers))
    res.end(Buffer.from(await r.arrayBuffer()))
  })
  .listen(8000, '127.0.0.1', () => console.log('function local on :8000'))