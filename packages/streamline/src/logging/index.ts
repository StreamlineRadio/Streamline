import log from 'electron-log/main'
import { join } from 'path'
import { app } from 'electron'

export function initLogging(): void {
  log.transports.file.resolvePathFn = () =>
    join(app.getPath('userData'), 'logs', `streamline-${datestamp()}.log`)
  log.transports.file.maxSize = 5 * 1024 * 1024
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
  log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : false
}

function datestamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export { log }
