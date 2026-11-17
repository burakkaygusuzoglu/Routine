import { handleRequest } from './api.ts'
import { runCron } from './cron.ts'
import type { Deps, Env } from './types.ts'

const deps = (): Deps => ({ now: () => Date.now(), fetch: (input, init) => fetch(input, init) })

export default {
  fetch: (request: Request, env: Env) => handleRequest(request, env, deps()),
  scheduled: (_event: ScheduledController, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(runCron(env, deps()))
  },
} satisfies ExportedHandler<Env>
