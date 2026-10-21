// Dev-only page (/sandbox) for trying symptom shaders in isolation.

import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Application, defaultFilterVert, Filter, GlProgram, Sprite, Texture } from 'pixi.js'
import GUI from 'lil-gui'
import diplopiaFrag from '../../rendering/shaders/diplopia.frag?raw'
import { createTestPattern } from './testPattern'

export default function ShaderSandbox() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current!
    const app = new Application()
    const gui = new GUI({ title: 'Shader sandbox' })
    let cancelled = false

    const setup = (async () => {
      await app.init({ preference: 'webgl', resizeTo: host, background: '#1e1e1e', antialias: true })
      if (cancelled) return
      host.appendChild(app.canvas)
      // Lets the PixiJS DevTools browser extension find the app.
      ;(globalThis as { __PIXI_APP__?: Application }).__PIXI_APP__ = app

      const sprite = new Sprite(Texture.from(createTestPattern()))
      app.stage.addChild(sprite)

      // Scale the image to fit the canvas, centered.
      const fit = () => {
        const { width, height } = app.screen
        const scale = Math.min(width / sprite.texture.width, height / sprite.texture.height)
        sprite.scale.set(scale)
        sprite.position.set((width - sprite.width) / 2, (height - sprite.height) / 2)
      }
      fit()
      app.renderer.on('resize', fit)

      const diplopia = new Filter({
        glProgram: new GlProgram({ vertex: defaultFilterVert, fragment: diplopiaFrag, name: 'diplopia' }),
        resources: {
          symptomUniforms: {
            u_offset: { value: 0.02, type: 'f32' },
            u_angle: { value: 0, type: 'f32' },
            u_opacity: { value: 0.5, type: 'f32' },
          },
        },
      })
      sprite.filters = [diplopia]

      const folder = gui.addFolder('Diplopia')
      folder.add(diplopia, 'enabled')
      const u = diplopia.resources.symptomUniforms.uniforms
      folder.add(u, 'u_offset', 0, 0.2, 0.001).name('offset')
      folder.add(u, 'u_angle', 0, 360, 1).name('angle (deg)')
      folder.add(u, 'u_opacity', 0, 1, 0.01).name('ghost opacity')

      // Swap in a local photo (stays in the browser, never uploaded).
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.accept = 'image/*'
      fileInput.onchange = async () => {
        const file = fileInput.files?.[0]
        if (!file) return
        const previous = sprite.texture
        sprite.texture = Texture.from(await createImageBitmap(file))
        previous.destroy(true)
        fit()
      }
      gui.add({ load: () => fileInput.click() }, 'load').name('Load image…')
    })()

    // StrictMode mounts effects twice in dev, so wait for setup before tearing down.
    return () => {
      cancelled = true
      gui.destroy()
      setup.then(() => app.destroy(true, { children: true, texture: true }))
    }
  }, [])

  return (
    <>
      <div ref={hostRef} style={{ position: 'fixed', inset: 0 }} />
      <Link to="/sandbox/scotoma" style={{ position: 'fixed', bottom: 16, left: 16, padding: '8px 12px', borderRadius: 6, background: '#1e2c49', color: 'white', fontSize: 13 }}>
        Scotoma sandbox →
      </Link>
    </>
  )
}
