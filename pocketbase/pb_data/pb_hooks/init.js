/// <reference path="../pb_data/types.d.ts" /> // this is not working

// This runs once at server startup
onServerStart((e) => {
  console.log('[pb_hooks] Server started at', e.address)
})

// Example: custom API route
routerAdd('GET', '/hello', (c) => {
  return c.json(200, { msg: 'Hello from pb_hooks!' })
})

// Example: hook into record creation
onRecordBeforeCreateRequest('games', (e) => {
  console.log('[pb_hooks] Creating game:', e.record)
})
