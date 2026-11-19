import { handler } from '../functions/handler.ts'

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' ' + detail : ''}`)
  if (!ok) failed++
}
const call = (path, init) => handler(new Request(`http://local/functions/v1/app${path}`, init))
const post = (path, body) =>
  call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

const r404 = await call('/nope')
check('unknown path 404', r404.status === 404)

const rStatus = await call('/status')
const status = await rStatus.json()
check('status 200 aiEnabled', rStatus.status === 200 && status.aiEnabled === true)

const rBad = await post('/generate', { prompt: '', style: 'meme' })
check('generate bad body 400', rBad.status === 400)

const rMethod = await call('/generate')
check('generate GET without id 405', rMethod.status === 405)

const rVarBad = await post('/variations', { image: 'https://evil/x.png' })
check('variations bad image 400', rVarBad.status === 400)

const rProxyBad = await call('/image-proxy?url=https://evil.example.com/x.png')
check('image-proxy whitelist 400', rProxyBad.status === 400)

const rSub = await post('/generate', { prompt: '一只猫', style: 'meme' })
const sub = await rSub.json()
check('generate submit 202', rSub.status === 202 && !!sub.taskId)
if (sub.taskId) {
  let task
  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000))
    task = await (await call(`/generate/${sub.taskId}`)).json()
    if (task.status !== 'pending') break
  }
  check('poll succeeded', task?.status === 'succeeded' && !!task.imageUrl)
  if (task?.imageUrl) {
    const rImg = await call(`/image-proxy?url=${encodeURIComponent(task.imageUrl)}`)
    const buf = await rImg.arrayBuffer()
    check(
      'image-proxy 200 png',
      rImg.status === 200 && (rImg.headers.get('content-type') ?? '').includes('image/') && buf.byteLength > 0,
      `${buf.byteLength} bytes`,
    )
  }
}

process.exit(failed ? 1 : 0)