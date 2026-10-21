import { useEffect, useRef, useState } from 'react'
import { Application, Sprite, Texture, VideoSource, type Filter } from 'pixi.js'

import { symptomFilters } from '../../../rendering/filterRegistry'
import type { SceneType } from '../../../scenes/types'
import type { SymptomLayer } from '../../../symptoms/types'

interface SymptomCanvasProps {
  mediaUrl: string
  mediaType: SceneType
  label: string
  layers: SymptomLayer[]
  // every scene's file, these get downloaded in the background so switching is instant
  preloadMedia: { url: string; type: SceneType }[]
  onError: () => void
}

// draws the scene (photo or video) with pixi and puts the symptom filters on top of it
function SymptomCanvas({ mediaUrl, mediaType, label, layers, preloadMedia, onError }: SymptomCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  // the sprite is the picture on the pixi canvas, a ref keeps the same one between renders
  const spriteRef = useRef<Sprite | null>(null)

  // one filter per layer, saved by the layer's id so it gets made once and reused
  // (only the settings change when a slider moves)
  const filtersRef = useRef(new Map<string, Filter>())

  // every photo/video that's been loaded, saved by its url so it never downloads twice
  const textureCacheRef = useRef(new Map<string, Promise<Texture>>())

  // the video that's showing right now (null when it's a photo), the pause button uses it
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  // true while the next photo or video is still downloading (shows the Loading label)
  const [isLoading, setIsLoading] = useState(true)

  // stays null until pixi is done setting up
  const [app, setApp] = useState<Application | null>(null)

  // keeps the newest onError in a ref so the effects below don't restart
  // every time the parent re-renders (the parent makes a new function each render)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  })

  // plays the video and updates the button (play can fail if the browser blocks it)
  function playVideo(video: HTMLVideoElement) {
    video
      .play()
      .then(() => setIsPaused(false))
      .catch(() => setIsPaused(true))
  }

  // loads a photo or video once and keeps it, so going back to it is instant
  // the promise gets saved right away so the same file never downloads twice at the same time
  function loadTexture(url: string, type: SceneType): Promise<Texture> {
    const cache = textureCacheRef.current
    const saved = cache.get(url)
    if (saved !== undefined) {
      return saved
    }

    const loading = type === 'video' ? loadVideoTexture(url) : loadImageTexture(url)
    cache.set(url, loading)

    // if it fails take it out of the cache so it can be tried again next time
    loading.catch(() => cache.delete(url))

    return loading
  }

  // sets up the pixi canvas once when the component shows up
  useEffect(() => {
    const host = hostRef.current
    if (host === null) {
      return
    }

    const pixiApp = new Application()
    const cache = textureCacheRef.current
    const filters = filtersRef.current
    let sprite: Sprite | null = null
    let cancelled = false
    let initialized = false

    const setup = pixiApp
      .init({ preference: 'webgl', resizeTo: host, backgroundAlpha: 0, antialias: true })
      .then(() => {
        initialized = true
        if (cancelled) {
          return
        }

        host.appendChild(pixiApp.canvas)

        // empty sprite for now, the picture gets put in by the next effect
        const newSprite = new Sprite()
        pixiApp.stage.addChild(newSprite)
        sprite = newSprite
        spriteRef.current = newSprite

        // refit the picture whenever the canvas changes size
        pixiApp.renderer.on('resize', () => fitSprite(pixiApp, newSprite))

        setApp(pixiApp)
      })
      .catch((error: unknown) => {
        // usually means the browser doesn't support webgl
        console.error('Could not start the scene canvas', error)
        if (!cancelled) {
          onErrorRef.current()
        }
      })

    // cleans up the canvas when the component closes
    // waits for setup to finish first (react strict mode runs this twice in dev)
    return () => {
      cancelled = true
      spriteRef.current = null
      videoRef.current = null
      setApp(null)

      void setup.then(() => {
        if (initialized) {
          // take the picture off the sprite first, the saved textures get freed below
          if (sprite !== null) {
            sprite.texture = Texture.EMPTY
          }
          pixiApp.destroy(true, { children: true })
        }

        for (const filter of filters.values()) {
          filter.destroy()
        }
        filters.clear()

        // free every saved photo and video (this also stops any videos)
        for (const loading of cache.values()) {
          loading.then((texture) => texture.destroy(true)).catch(() => {})
        }
        cache.clear()
      })
    }
  }, [])

  // shows the selected photo or video every time the scene changes
  useEffect(() => {
    const sprite = spriteRef.current
    if (app === null || sprite === null) {
      return
    }

    let cancelled = false
    setIsLoading(true)

    loadTexture(mediaUrl, mediaType)
      .then((texture) => {
        // the scene changed while this one was loading (it stays saved for later)
        if (cancelled) {
          return
        }

        // pause the video that was showing before, it stays saved so it can come back instantly
        getVideo(sprite.texture)?.pause()

        sprite.texture = texture
        fitSprite(app, sprite)
        setIsLoading(false)

        const video = getVideo(texture)
        videoRef.current = video

        if (video !== null) {
          // start from the beginning every time the video gets picked
          video.currentTime = 0

          // if the user has reduce motion turned on, the video waits for them to press play
          if (prefersReducedMotion()) {
            setIsPaused(true)
          } else {
            playVideo(video)
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          onErrorRef.current()
        }
      })

    // if the scene changes before this one finishes loading, don't show the old one
    return () => {
      cancelled = true
    }
    // loadTexture only uses refs so it's safe to leave out
  }, [app, mediaUrl, mediaType])

  // after the current scene is showing, download the rest in the background one at a time
  // one at a time so it doesn't slow down the scene you're actually looking at
  useEffect(() => {
    if (app === null || isLoading) {
      return
    }

    let cancelled = false

    async function preloadAll() {
      for (const media of preloadMedia) {
        if (cancelled) {
          return
        }

        try {
          await loadTexture(media.url, media.type)
        } catch {
          // skip files that fail here, they'll show the error message if someone picks them
        }
      }
    }

    void preloadAll()

    return () => {
      cancelled = true
    }
  }, [app, isLoading, preloadMedia])

  // puts the turned on symptoms onto the sprite every time a toggle or slider changes
  // the order of sprite.filters is the order they get drawn in (same order as the panel)
  useEffect(() => {
    const sprite = spriteRef.current
    if (app === null || sprite === null) {
      return
    }

    const filters = filtersRef.current
    const activeFilters: Filter[] = []

    for (const layer of layers) {
      const definition = symptomFilters[layer.symptomId]

      // skip it if it's turned off or there's no shader for it yet
      if (!layer.enabled || definition === undefined) {
        continue
      }

      let filter = filters.get(layer.instanceId)
      if (filter === undefined) {
        filter = definition.create()
        filters.set(layer.instanceId, filter)
      }

      definition.update(filter, layer.values)
      activeFilters.push(filter)
    }

    // get rid of filters for layers that were removed from the panel
    const layerIds = new Set(layers.map((layer) => layer.instanceId))
    for (const [id, filter] of filters) {
      if (!layerIds.has(id)) {
        filter.destroy()
        filters.delete(id)
      }
    }

    sprite.filters = activeFilters
  }, [app, layers])

  // plays the video if it's paused, pauses it if it's playing
  function togglePlay() {
    const video = videoRef.current
    if (video === null) {
      return
    }

    if (video.paused) {
      playVideo(video)
    } else {
      video.pause()
      setIsPaused(true)
    }
  }

  return (
    <div className="relative h-full w-full">
      <div ref={hostRef} role="img" aria-label={label} className="h-full w-full" />

      {/* the old scene stays up while the new one downloads, this just lets you know it's coming */}
      {isLoading && (
        <span
          role="status"
          className="absolute right-3 top-3 rounded-full bg-[#1e2c49]/80 px-3 py-1 text-xs font-semibold text-white"
        >
          Loading…
        </span>
      )}

      {/* videos need a way to pause (accessibility rule for moving stuff longer than 5 seconds) */}
      {mediaType === 'video' && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute bottom-3 left-3 rounded-full bg-[#1e2c49]/80 px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#1e2c49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {isPaused ? 'Play' : 'Pause'}
        </button>
      )}
    </div>
  )
}

// downloads a photo and turns it into a texture
async function loadImageTexture(url: string): Promise<Texture> {
  const image = new Image()
  image.src = url

  // decode() waits until the image is fully downloaded and ready to draw
  await image.decode()
  return Texture.from(image)
}

// downloads a video until its first frame is ready and turns it into a texture
// it starts paused, it only plays once it gets shown
async function loadVideoTexture(url: string): Promise<Texture> {
  const video = createVideoElement(url)

  // pixi copies each new video frame into the texture by itself while it plays
  const source = new VideoSource({ resource: video, autoPlay: false })

  try {
    await source.load()
    // wait for a real picture, otherwise it shows black for a bit while it buffers
    await waitForFirstFrame(video)
  } catch (error) {
    source.destroy()
    throw error
  }

  source.update() // copies the first frame into the texture right away
  return new Texture({ source })
}

// gives back the video inside a texture, or null if the texture is a photo
function getVideo(texture: Texture): HTMLVideoElement | null {
  return texture.source instanceof VideoSource ? texture.source.resource : null
}

// makes a hidden video element for pixi to read frames from
function createVideoElement(url: string): HTMLVideoElement {
  const video = document.createElement('video')
  video.src = url
  video.muted = true // browsers only autoplay muted videos
  video.loop = true
  video.playsInline = true // stops phones from going full screen
  video.preload = 'auto' // download it ahead of time instead of only when it plays
  return video
}

// waits until the video has its first frame downloaded and ready to draw
function waitForFirstFrame(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    video.addEventListener('loadeddata', () => resolve(), { once: true })
    video.addEventListener('error', () => reject(new Error('video failed to load')), { once: true })
  })
}

// true if the user turned on "reduce motion" in their computer settings
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// scales the picture to fit inside the canvas and centers it
function fitSprite(app: Application, sprite: Sprite) {
  const { width, height } = app.screen
  const scale = Math.min(width / sprite.texture.width, height / sprite.texture.height)

  sprite.scale.set(scale)
  sprite.position.set((width - sprite.width) / 2, (height - sprite.height) / 2)
}

export default SymptomCanvas
