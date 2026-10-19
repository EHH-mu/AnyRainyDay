import { RainyWindow } from '../src/core/RainyWindow'

type NumericSetting
  = | 'intensity'
    | 'speed'
    | 'normal'
    | 'zoom'
    | 'time'
    | 'effectMix'
    | 'backgroundProtection'
    | 'blurIntensity'
    | 'blurIterations'
    | 'brightness'

type BooleanSetting = 'postProcessing' | 'panning' | 'lightning' | 'textureFill'
type ViewMode = 'effect' | 'compare' | 'original'

interface EditorSettings {
  intensity: number
  speed: number
  normal: number
  zoom: number
  time: number
  effectMix: number
  backgroundProtection: number
  blurIntensity: number
  blurIterations: number
  brightness: number
  postProcessing: boolean
  panning: boolean
  lightning: boolean
  textureFill: boolean
}

const presets: Record<string, EditorSettings> = {
  light: {
    intensity: 0.24,
    speed: 0.32,
    normal: 0.45,
    zoom: 1.15,
    time: 8,
    effectMix: 0.56,
    backgroundProtection: 1,
    blurIntensity: 0.2,
    blurIterations: 8,
    brightness: 1,
    postProcessing: false,
    panning: false,
    lightning: false,
    textureFill: true,
  },
  natural: {
    intensity: 0.42,
    speed: 0.45,
    normal: 0.7,
    zoom: 1,
    time: 8,
    effectMix: 0.72,
    backgroundProtection: 1,
    blurIntensity: 0.35,
    blurIterations: 10,
    brightness: 0.96,
    postProcessing: true,
    panning: false,
    lightning: false,
    textureFill: true,
  },
  heavy: {
    intensity: 0.72,
    speed: 0.7,
    normal: 1.05,
    zoom: 0.82,
    time: 8,
    effectMix: 0.88,
    backgroundProtection: 1,
    blurIntensity: 0.55,
    blurIterations: 14,
    brightness: 0.92,
    postProcessing: true,
    panning: false,
    lightning: false,
    textureFill: true,
  },
}

function $<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element)
    throw new Error(`Missing editor element: ${selector}`)
  return element
}

const imageInput = $<HTMLInputElement>('#imageInput')
const settingsInput = $<HTMLInputElement>('#settingsInput')
const renderSurface = $<HTMLDivElement>('#renderSurface')
const originalImage = $<HTMLImageElement>('#originalImage')
const emptyState = $<HTMLButtonElement>('#emptyState')
const dropTarget = $<HTMLDivElement>('#dropTarget')
const fileMeta = $<HTMLParagraphElement>('#fileMeta')
const renderMeta = $<HTMLSpanElement>('#renderMeta')
const statusText = $<HTMLSpanElement>('#statusText')
const exportPngButton = $<HTMLButtonElement>('#exportPngButton')
const playButton = $<HTMLButtonElement>('#playButton')
const compareSlider = $<HTMLInputElement>('#compareSlider')
const compareLine = $<HTMLDivElement>('#compareLine')
const toast = $<HTMLDivElement>('#toast')

let settings: EditorSettings = { ...presets.natural }
let rainyWindow: RainyWindow | undefined
let currentObjectUrl: string | undefined
let currentFileName = 'rain-effect'
let imageWidth = 0
let imageHeight = 0
let isPlaying = false
let toastTimer: number | undefined

function showToast(message: string): void {
  toast.textContent = message
  toast.classList.add('visible')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2200)
}

function formatValue(key: NumericSetting, value: number): string {
  if (key === 'intensity' || key === 'effectMix' || key === 'backgroundProtection' || key === 'brightness')
    return `${Math.round(value * 100)}%`
  if (key === 'time')
    return `${value.toFixed(1)} s`
  if (key === 'blurIterations')
    return String(Math.round(value))
  return value.toFixed(2)
}

function updateControlValues(): void {
  document.querySelectorAll<HTMLInputElement>('input[type="range"][data-key]').forEach((input) => {
    const key = input.dataset.key as NumericSetting
    input.value = String(settings[key])
    const output = document.querySelector<HTMLOutputElement>(`[data-output="${key}"]`)
    if (output)
      output.value = formatValue(key, settings[key])
  })

  document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-key]').forEach((input) => {
    const key = input.dataset.key as BooleanSetting
    input.checked = settings[key]
  })
}

function applySettings(next: EditorSettings, updateControls = true): void {
  settings = { ...next }
  if (updateControls)
    updateControlValues()

  if (!rainyWindow)
    return

  rainyWindow.setIntensity(settings.intensity)
  rainyWindow.setSpeed(settings.speed)
  rainyWindow.setNormal(settings.normal)
  rainyWindow.setZoom(settings.zoom)
  rainyWindow.setEffectMix(settings.effectMix)
  rainyWindow.setBackgroundProtection(settings.backgroundProtection)
  rainyWindow.setBlurIntensity(settings.blurIntensity)
  rainyWindow.setBlurIterations(settings.blurIterations)
  rainyWindow.setBrightness(settings.brightness)
  rainyWindow.setPostProcessing(settings.postProcessing)
  rainyWindow.setPanning(settings.panning)
  rainyWindow.setLightning(settings.lightning)
  rainyWindow.setTextureFill(settings.textureFill)
  rainyWindow.setTime(settings.time)
}

function setPlaying(next: boolean): void {
  if (!rainyWindow)
    return

  if (next === isPlaying) {
    if (!next)
      rainyWindow.pause()
    return
  }

  isPlaying = next
  if (isPlaying) {
    rainyWindow.resume()
    playButton.textContent = '❚❚'
    playButton.title = '暂停雨效'
    playButton.setAttribute('aria-label', '暂停雨效')
  }
  else {
    rainyWindow.pause()
    settings.time = rainyWindow.getCurrentTime()
    updateControlValues()
    playButton.textContent = '▶'
    playButton.title = '播放雨效'
    playButton.setAttribute('aria-label', '播放雨效')
  }
}

function readImageSize(url: string): Promise<{ width: number, height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error('无法读取这张图片'))
    image.src = url
  })
}

async function loadImageFile(file: File): Promise<void> {
  if (!file.type.startsWith('image/')) {
    showToast('请选择 PNG、JPG 或 WEBP 图片')
    return
  }

  statusText.textContent = '正在载入图片…'
  exportPngButton.disabled = true
  const nextUrl = URL.createObjectURL(file)

  try {
    const size = await readImageSize(nextUrl)
    imageWidth = size.width
    imageHeight = size.height
    currentFileName = file.name.replace(/\.[^.]+$/, '') || 'rain-effect'

    emptyState.classList.add('hidden')
    renderSurface.classList.remove('hidden')
    renderSurface.style.setProperty('--aspect', String(imageWidth / imageHeight))
    renderSurface.dataset.view = 'effect'
    setViewMode('effect')

    if (!rainyWindow) {
      rainyWindow = new RainyWindow(renderSurface, {
        ...settings,
        fps: 60,
        pixelRatio: 1,
      })
      const canvas = rainyWindow.getCanvas()
      canvas.style.width = '100%'
      canvas.style.height = '100%'
    }

    setPlaying(false)
    rainyWindow.setOutputSize(imageWidth, imageHeight)
    await rainyWindow.loadImage(nextUrl)
    originalImage.src = nextUrl
    applySettings(settings)
    rainyWindow.pause()
    isPlaying = false

    if (currentObjectUrl)
      URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = nextUrl

    fileMeta.textContent = `${file.name} · ${imageWidth} × ${imageHeight}`
    renderMeta.textContent = `PNG · ${imageWidth} × ${imageHeight}`
    statusText.textContent = '静态精调模式'
    exportPngButton.disabled = false
    showToast('图片已载入，导出将保持原始分辨率')
  }
  catch (error) {
    URL.revokeObjectURL(nextUrl)
    statusText.textContent = '图片载入失败'
    showToast(error instanceof Error ? error.message : '图片载入失败')
  }
  finally {
    imageInput.value = ''
  }
}

function setViewMode(mode: ViewMode): void {
  renderSurface.dataset.view = mode
  document.querySelectorAll<HTMLButtonElement>('#viewMode button').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === mode)
  })
}

function updateComparePosition(): void {
  const position = Number(compareSlider.value)
  originalImage.style.clipPath = `inset(0 ${100 - position}% 0 0)`
  compareLine.style.left = `${position}%`
}

function clearPresetSelection(): void {
  document.querySelectorAll<HTMLButtonElement>('#presetGrid button').forEach(button => button.classList.remove('active'))
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function exportPng(): void {
  if (!rainyWindow)
    return
  rainyWindow.renderOnce(settings.time)
  rainyWindow.getCanvas().toBlob((blob) => {
    if (!blob) {
      showToast('PNG 导出失败')
      return
    }
    downloadBlob(blob, `${currentFileName}-rain.png`)
    showToast(`已导出 ${imageWidth} × ${imageHeight} PNG`)
  }, 'image/png')
}

function exportSettings(): void {
  const payload = JSON.stringify({
    format: 'AnyRainyDayEditor',
    version: 1,
    settings,
  }, null, 2)
  downloadBlob(new Blob([payload], { type: 'application/json' }), `${currentFileName}-rain-settings.json`)
  showToast('参数设置已导出')
}

function isEditorSettings(value: unknown): value is EditorSettings {
  if (!value || typeof value !== 'object')
    return false
  const candidate = value as Partial<EditorSettings>
  const numericKeys: NumericSetting[] = [
    'intensity',
    'speed',
    'normal',
    'zoom',
    'time',
    'effectMix',
    'backgroundProtection',
    'blurIntensity',
    'blurIterations',
    'brightness',
  ]
  const booleanKeys: BooleanSetting[] = ['postProcessing', 'panning', 'lightning', 'textureFill']
  return numericKeys.every(key => typeof candidate[key] === 'number' && Number.isFinite(candidate[key]))
    && booleanKeys.every(key => typeof candidate[key] === 'boolean')
}

async function importSettings(file: File): Promise<void> {
  try {
    const parsed = JSON.parse(await file.text()) as { settings?: unknown }
    if (!isEditorSettings(parsed.settings))
      throw new Error('不是有效的 AnyRainyDay 设置文件')
    setPlaying(false)
    clearPresetSelection()
    applySettings(parsed.settings)
    showToast('参数设置已导入')
  }
  catch (error) {
    showToast(error instanceof Error ? error.message : '设置导入失败')
  }
  finally {
    settingsInput.value = ''
  }
}

$('#openImageButton').addEventListener('click', () => imageInput.click())
emptyState.addEventListener('click', () => imageInput.click())
imageInput.addEventListener('change', () => {
  const file = imageInput.files?.[0]
  if (file)
    void loadImageFile(file)
})

$('#importSettingsButton').addEventListener('click', () => settingsInput.click())
settingsInput.addEventListener('change', () => {
  const file = settingsInput.files?.[0]
  if (file)
    void importSettings(file)
})
$('#exportSettingsButton').addEventListener('click', exportSettings)
exportPngButton.addEventListener('click', exportPng)

document.querySelectorAll<HTMLInputElement>('input[type="range"][data-key]').forEach((input) => {
  input.addEventListener('input', () => {
    const key = input.dataset.key as NumericSetting
    const value = Number(input.value)
    if (key === 'blurIterations')
      settings[key] = Math.round(value)
    else
      settings[key] = value

    const output = document.querySelector<HTMLOutputElement>(`[data-output="${key}"]`)
    if (output)
      output.value = formatValue(key, settings[key])

    clearPresetSelection()
    if (key === 'time') {
      setPlaying(false)
      rainyWindow?.setTime(settings.time)
    }
    else {
      applySettings(settings, false)
    }
  })
})

document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-key]').forEach((input) => {
  input.addEventListener('change', () => {
    const key = input.dataset.key as BooleanSetting
    settings[key] = input.checked
    clearPresetSelection()
    applySettings(settings, false)
  })
})

document.querySelectorAll<HTMLButtonElement>('#presetGrid button').forEach((button) => {
  button.addEventListener('click', () => {
    const preset = button.dataset.preset
    if (!preset || !presets[preset])
      return
    setPlaying(false)
    applySettings({ ...presets[preset], time: settings.time })
    document.querySelectorAll<HTMLButtonElement>('#presetGrid button').forEach((item) => {
      item.classList.toggle('active', item === button)
    })
  })
})

$('#resetButton').addEventListener('click', () => {
  setPlaying(false)
  applySettings({ ...presets.natural })
  document.querySelectorAll<HTMLButtonElement>('#presetGrid button').forEach((button) => {
    button.classList.toggle('active', button.dataset.preset === 'natural')
  })
  showToast('已恢复自然预设')
})

document.querySelectorAll<HTMLButtonElement>('#viewMode button').forEach((button) => {
  button.addEventListener('click', () => setViewMode(button.dataset.view as ViewMode))
})

compareSlider.addEventListener('input', updateComparePosition)
updateComparePosition()

playButton.addEventListener('click', () => setPlaying(!isPlaying))
$('#randomizeButton').addEventListener('click', () => {
  setPlaying(false)
  settings.time = Math.round(Math.random() * 800) / 10
  updateControlValues()
  rainyWindow?.setTime(settings.time)
  clearPresetSelection()
})

for (const eventName of ['dragenter', 'dragover']) {
  dropTarget.addEventListener(eventName, (event) => {
    event.preventDefault()
    dropTarget.classList.add('dragging')
  })
}

for (const eventName of ['dragleave', 'drop']) {
  dropTarget.addEventListener(eventName, (event) => {
    event.preventDefault()
    dropTarget.classList.remove('dragging')
  })
}

dropTarget.addEventListener('drop', (event) => {
  const file = event.dataTransfer?.files[0]
  if (file)
    void loadImageFile(file)
})

window.addEventListener('beforeunload', () => {
  rainyWindow?.destroy()
  if (currentObjectUrl)
    URL.revokeObjectURL(currentObjectUrl)
})

updateControlValues()
