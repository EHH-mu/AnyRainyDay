import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rename, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

const DEFAULT_SOURCE = 'D:\\3D data&result\\cabin_rain_100\\images'
const DEFAULT_OUTPUT = 'D:\\3D data&result\\cabin_rain_100\\AnyRainyDay_enhanced'
const EDITOR_URL = 'http://127.0.0.1:5173/editor.html'
const DEBUG_PORT = 9334
const FRAME_RATE = 10
const START_TIME = 6.9

const settings = {
  intensity: 0.42,
  speed: 0.35,
  normal: 0.70,
  zoom: 1.35,
  effectMix: 0.72,
  backgroundProtection: 1,
  blurIntensity: 0.35,
  blurIterations: 10,
  brightness: 0.96,
  postProcessing: true,
  panning: false,
  lightning: false,
  textureFill: true,
}

const sourceDir = path.resolve(process.argv[2] ?? DEFAULT_SOURCE)
const outputDir = path.resolve(process.argv[3] ?? DEFAULT_OUTPUT)

function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ]
  return candidates.find(existsSync)
}

async function waitForEndpoint(url, timeoutMs = 20000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok)
        return
    }
    catch {}
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function connectToPage() {
  const endpoint = `http://127.0.0.1:${DEBUG_PORT}`
  await waitForEndpoint(`${endpoint}/json/version`)
  const target = await fetch(`${endpoint}/json/new?${encodeURIComponent(EDITOR_URL)}`, {
    method: 'PUT',
  }).then(response => response.json())
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  let nextId = 0
  const pending = new Map()
  const browserErrors = []

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id)
      pending.delete(message.id)
      if (message.error)
        request.reject(new Error(message.error.message))
      else
        request.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown')
      browserErrors.push(message.params.exceptionDetails.text)
  })

  function command(method, params = {}) {
    const id = ++nextId
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      socket.send(JSON.stringify({ id, method, params }))
    })
  }

  async function evaluate(expression, awaitPromise = false) {
    const response = await command('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
    })
    if (response.exceptionDetails)
      throw new Error(response.exceptionDetails.text)
    return response.result.value
  }

  async function waitFor(expression, timeoutMs = 30000) {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      if (await evaluate(expression))
        return
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error(`Timed out waiting for page state: ${expression}`)
  }

  return { browserErrors, command, evaluate, socket, waitFor }
}

async function waitForDownload(filePath, timeoutMs = 30000) {
  const started = Date.now()
  let previousSize = -1
  let stableChecks = 0

  while (Date.now() - started < timeoutMs) {
    if (existsSync(filePath)) {
      const size = (await stat(filePath)).size
      stableChecks = size > 0 && size === previousSize ? stableChecks + 1 : 0
      previousSize = size
      if (stableChecks >= 2)
        return size
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Timed out waiting for download: ${filePath}`)
}

async function main() {
  if (!existsSync(sourceDir))
    throw new Error(`Source directory does not exist: ${sourceDir}`)
  if (existsSync(outputDir))
    throw new Error(`Output directory already exists: ${outputDir}`)

  const files = (await readdir(sourceDir, { withFileTypes: true }))
    .filter(entry => entry.isFile() && /\.(?:png|jpe?g|webp)$/i.test(entry.name))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  if (files.length === 0)
    throw new Error(`No supported images found in: ${sourceDir}`)

  await waitForEndpoint(EDITOR_URL, 5000)
  await mkdir(outputDir)

  const chromePath = findChrome()
  if (!chromePath)
    throw new Error('Chrome or Edge was not found')

  const profileDir = await mkdtemp(path.join(tmpdir(), 'anyrainyday-batch-'))
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--window-size=1440,960',
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true })

  try {
    const { browserErrors, command, evaluate, socket, waitFor } = await connectToPage()
    await command('Page.enable')
    await command('Runtime.enable')
    await command('DOM.enable')
    await command('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: outputDir,
    })
    await command('Page.navigate', { url: EDITOR_URL })
    await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('#imageInput'))`)

    const inputNode = await command('Runtime.evaluate', {
      expression: `document.querySelector('#imageInput')`,
      returnByValue: false,
    })
    const objectId = inputNode.result.objectId

    await evaluate(`(() => {
      const values = ${JSON.stringify(settings)}
      for (const [key, value] of Object.entries(values)) {
        const control = document.querySelector('[data-key="' + key + '"]')
        if (!control)
          throw new Error('Missing control: ' + key)
        if (control.type === 'checkbox')
          control.checked = value
        else
          control.value = String(value)
        control.dispatchEvent(new Event(control.type === 'checkbox' ? 'change' : 'input', { bubbles: true }))
      }
    })()`)

    for (let index = 0; index < files.length; index++) {
      const name = files[index]
      const sourcePath = path.join(sourceDir, name)
      const baseName = path.parse(name).name
      const downloadedPath = path.join(outputDir, `${baseName}-rain.png`)
      const finalPath = path.join(outputDir, `${baseName}.png`)
      const frameTime = START_TIME + index / FRAME_RATE

      await command('DOM.setFileInputFiles', { files: [sourcePath], objectId })
      await waitFor(`document.querySelector('#fileMeta')?.textContent?.startsWith(${JSON.stringify(name)})`)
      await evaluate(`(() => {
        const time = document.querySelector('[data-key="time"]')
        time.value = ${frameTime.toFixed(3)}
        time.dispatchEvent(new Event('input', { bubbles: true }))
        document.querySelector('#exportPngButton').click()
      })()`)
      await waitForDownload(downloadedPath)
      await rename(downloadedPath, finalPath)

      if ((index + 1) % 10 === 0 || index === files.length - 1)
        process.stdout.write(`Rendered ${index + 1}/${files.length}\n`)
    }

    await rm(path.join(outputDir, 'downloads.htm'), { force: true })

    if (browserErrors.length)
      throw new Error(`Browser errors: ${browserErrors.join('; ')}`)
    socket.close()
  }
  catch (error) {
    await rm(outputDir, { recursive: true, force: true })
    throw error
  }
  finally {
    chrome.kill()
    await rm(profileDir, { recursive: true, force: true }).catch(() => {})
  }

  process.stdout.write(`Completed ${files.length} frames in ${outputDir}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
