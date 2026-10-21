import { isAbsolute } from 'node:path'

import type { Context, Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { MAX_FILE_TRANSFER_BYTES, readInsideRoot, writeInsideRoot } from '#mcp/tool/output'

/** The absolute path after `/files/`, one segment per folder, so the URL ends in the file's name. */
function filePath(c: Context): string {
  const path = c.req.path.slice('/files/'.length).split('/').map(decodeURIComponent).join('/')
  // A POSIX path loses its leading slash in the URL; a Windows one starts with its drive.
  return isAbsolute(path) ? path : `/${path}`
}

function failure(c: Context, e: unknown) {
  return c.json({ error: e instanceof Error ? e.message : String(e) }, 400)
}

/**
 * A browser app cannot reach the paths the file tools name, so it reads and writes them through
 * `/files/`, inside the same root the tools resolve them in. The caller guards the route with the
 * server's token.
 */
export function registerFileRoutes(app: Hono, root: string): void {
  app.get('/files/*', async (c) => {
    try {
      const bytes = await readInsideRoot(filePath(c), root)
      return c.body(bytes, 200, { 'content-type': 'application/octet-stream' })
    } catch (e) {
      return failure(c, e)
    }
  })
  app.put(
    '/files/*',
    bodyLimit({
      maxSize: MAX_FILE_TRANSFER_BYTES,
      onError: (c) => c.json({ error: 'File is too large' }, 413)
    }),
    async (c) => {
      try {
        const bytes = new Uint8Array(await c.req.arrayBuffer())
        return c.json(await writeInsideRoot(filePath(c), root, bytes))
      } catch (e) {
        return failure(c, e)
      }
    }
  )
}
