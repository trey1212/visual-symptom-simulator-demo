import { useEffect, useRef, useState } from 'react'
import { Application, defaultFilterVert, Filter, GlProgram, Sprite, Texture } from 'pixi.js'
import GUI from 'lil-gui'
import scotomaFrag from '../../rendering/shaders/scotoma.frag?raw'
import { createTestPattern } from './testPattern'
import './scotomaSandbox.css'

const defaults = {
  u_x: 0.5, u_y: 0.5, u_size: 32, u_aspect: 1, u_angle: 0,
  u_softness: 0.4, u_irregularity: 0.45, u_strength: 1,
  u_mode: 2, u_gray: 0.45, u_blur: 2,
}

export default function ScotomaSandbox() {
  const hostRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('Starting WebGL…')
  const [error, setError] = useState('')

  useEffect(() => {
    const host = hostRef.current!
    const app = new Application()
    const gui = new GUI({ container: controlsRef.current!, title: 'Scotoma controls' })
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*'
    let cancelled = false
    let initialized = false
    let filter: Filter | undefined
    let observer: ResizeObserver | undefined
    let removePointerEvents = () => {}
    let bitmap: ImageBitmap | undefined
    let loadVersion = 0
    const debug = globalThis as { __PIXI_APP__?: Application }

    const setup = (async () => {
      await app.init({
        preference: 'webgl', preferWebGLVersion: 2, resizeTo: host,
        background: '#141c29', antialias: true, autoStart: false,
        resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true,
      })
      initialized = true
      if (cancelled) return
      host.appendChild(app.canvas)
      app.canvas.setAttribute('aria-label', 'Image with adjustable scotoma simulation')
      debug.__PIXI_APP__ = app

      const sprite = new Sprite(Texture.from(createTestPattern()))
      app.stage.addChild(sprite)
      filter = new Filter({
        glProgram: new GlProgram({ vertex: defaultFilterVert, fragment: scotomaFrag, name: 'scotoma' }),
        resources: {
          symptomUniforms: Object.fromEntries(
            Object.entries(defaults).map(([key, value]) => [key, { value, type: 'f32' }]),
          ),
        },
      })
      sprite.filters = [filter]
      const u = filter.resources.symptomUniforms.uniforms as typeof defaults
      const render = () => { if (!cancelled) app.render() }
      const fit = () => {
        if (cancelled) return
        app.renderer.resize(host.clientWidth, host.clientHeight)
        const scale = Math.min(app.screen.width / sprite.texture.width, app.screen.height / sprite.texture.height)
        sprite.scale.set(scale)
        sprite.position.set((app.screen.width - sprite.width) / 2, (app.screen.height - sprite.height) / 2)
        render()
      }
      observer = new ResizeObserver(fit)
      observer.observe(host)
      fit()

      gui.add(filter, 'enabled').name('Show scotoma')
      const appearance = gui.addFolder('Appearance')
      appearance.add(u, 'u_mode', { 'Dim / dark patch': 0, 'Blurred patch': 1, 'Blank patch': 2 }).name('Appearance').listen()
      appearance.add(u, 'u_strength', 0, 1, 0.01).name('Strength').listen()
      appearance.add(u, 'u_gray', 0, 1, 0.01).name('Blank brightness').listen()
      appearance.add(u, 'u_blur', 0, 5, 0.1).name('Blur radius (%)').listen()

      const shape = gui.addFolder('Size & shape')
      shape.add(u, 'u_size', 0, 90, 1).name('Diameter (%)').listen()
      shape.add(u, 'u_aspect', 0.4, 2.5, 0.05).name('Width / height').listen()
      shape.add(u, 'u_angle', 0, 360, 1).name('Rotation (deg)').listen()
      shape.add(u, 'u_softness', 0, 1, 0.01).name('Soft edge').listen()
      shape.add(u, 'u_irregularity', 0, 1, 0.01).name('Irregular edge').listen()

      const position = gui.addFolder('Position')
      position.add(u, 'u_x', 0, 1, 0.005).name('Horizontal').listen()
      position.add(u, 'u_y', 0, 1, 0.005).name('Vertical').listen()

      // Pointer placement uses sprite bounds, so letterboxing and display DPI
      // do not change the normalized image position. Sliders are the keyboard alternative.
      let dragging = false
      const move = (event: PointerEvent, clampToImage: boolean) => {
        const rect = app.canvas.getBoundingClientRect()
        const x = ((event.clientX - rect.left) * app.screen.width / rect.width - sprite.x) / sprite.width
        const y = ((event.clientY - rect.top) * app.screen.height / rect.height - sprite.y) / sprite.height
        if (!clampToImage && (x < 0 || x > 1 || y < 0 || y > 1)) return false
        u.u_x = Math.max(0, Math.min(1, x))
        u.u_y = Math.max(0, Math.min(1, y))
        render()
        return true
      }
      const down = (event: PointerEvent) => {
        if (!event.isPrimary || event.button !== 0 || !move(event, false)) return
        dragging = true
        app.canvas.setPointerCapture(event.pointerId)
      }
      const drag = (event: PointerEvent) => { if (dragging && event.isPrimary) move(event, true) }
      const up = () => { dragging = false }
      app.canvas.addEventListener('pointerdown', down)
      app.canvas.addEventListener('pointermove', drag)
      app.canvas.addEventListener('pointerup', up)
      app.canvas.addEventListener('pointercancel', up)
      app.canvas.addEventListener('lostpointercapture', up)
      removePointerEvents = () => {
        app.canvas.removeEventListener('pointerdown', down)
        app.canvas.removeEventListener('pointermove', drag)
        app.canvas.removeEventListener('pointerup', up)
        app.canvas.removeEventListener('pointercancel', up)
        app.canvas.removeEventListener('lostpointercapture', up)
      }

      const replaceImage = (source: HTMLCanvasElement | ImageBitmap) => {
        const previous = sprite.texture
        sprite.texture = Texture.from(source)
        previous.destroy(true)
        bitmap?.close()
        bitmap = source instanceof ImageBitmap ? source : undefined
        fit()
      }
      fileInput.onchange = async () => {
        const file = fileInput.files?.[0]
        if (!file) return
        const version = ++loadVersion
        setError('')
        try {
          const next = await createImageBitmap(file)
          if (cancelled || version !== loadVersion) { next.close(); return }
          replaceImage(next)
          setStatus(`Local image: ${file.name}`)
        } catch {
          if (!cancelled && version === loadVersion) setError('That image could not be opened. Try a PNG, JPEG, or WebP image.')
        } finally {
          if (version === loadVersion) fileInput.value = ''
        }
      }
      const actions = {
        load: () => fileInput.click(),
        reset: () => {
          Object.assign(u, defaults)
          filter!.enabled = true
          gui.controllersRecursive().forEach(controller => controller.updateDisplay())
          render()
        },
      }
      gui.add(actions, 'load').name('Load local image…')
      gui.add(actions, 'reset').name('Reset scotoma')
      gui.onChange(render)
      setStatus('Test pattern')
    })().catch((reason: unknown) => {
      console.error('Scotoma sandbox initialization failed', reason)
      if (!cancelled) {
        setStatus('Preview unavailable')
        setError('The WebGL preview could not start. Check that browser graphics acceleration is enabled, then reload.')
      }
    })

    return () => {
      cancelled = true
      ++loadVersion
      observer?.disconnect()
      removePointerEvents()
      fileInput.onchange = null
      gui.destroy()
      // Wait for async initialization before destruction (also for StrictMode).
      void setup.then(() => {
        if (debug.__PIXI_APP__ === app) delete debug.__PIXI_APP__
        if (initialized) app.destroy(true, { children: true, texture: true, textureSource: true })
        filter?.destroy()
        bitmap?.close()
      })
    }
  }, [])

  return (
    <div className="scotoma-sandbox">
      <main className="scotoma-layout">
        <section className="scotoma-preview" aria-label="Scotoma preview">
          <div className="scotoma-preview-caption">
            <span>{status}</span><span>Click or drag the image to place the spot</span>
          </div>
          <div ref={hostRef} className="scotoma-canvas" />
          {error && <p className="scotoma-error" role="alert">{error}</p>}
        </section>
        <aside className="scotoma-sidebar" aria-label="Simulation settings">
          <div ref={controlsRef} />
        </aside>
      </main>
    </div>
  )
}
