import 'dotenv/config'
import { app } from './app.js'

const port = Number(process.env.PORT ?? 3000)
const server = app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})

const shutdown = (signal: string) => {
  console.log(`${signal} received; closing server.`)
  server.close((error) => {
    if (error) {
      console.error(error)
      process.exitCode = 1
    }
    process.exit()
  })
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))
