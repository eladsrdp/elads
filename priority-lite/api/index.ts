// Vercel serverless entry point
// DIAGNOSTIC: zero external dependencies
import type { IncomingMessage, ServerResponse } from 'node:http'

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ ok: true, node: process.version, env: process.env.PRIORITY_MODE }))
}
