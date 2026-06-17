// Vercel serverless entry point
// TEMP DIAGNOSTIC: zero external dependencies — tests if basic function invocation works
import type { IncomingMessage, ServerResponse } from 'node:http'

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ ok: true, node: process.version, env: process.env.PRIORITY_MODE }))
}
