import { useEffect, useRef, useState } from 'react'

import { listScenes, sceneFileUrl } from '../../../api/scenes'
import type { Scene } from '../../../scenes/types'

interface ScenePickerProps {
  selectedSceneId: string | null
  onSelect: (scene: Scene) => void
  // gets called with the whole list once it loads (the preview uses it to preload)
  onScenesLoaded: (scenes: Scene[]) => void
}

type LoadStatus = 'loading' | 'error' | 'ready'
type SceneTab = 'photos' | 'videos'

// the scene that shows up first so the preview is never empty
const DEFAULT_SCENE_NAME = 'Beach'

// top bar with Photos / Videos tabs and a row of scenes you can scroll through and pick from
function ScenePicker({ selectedSceneId, onSelect, onScenesLoaded }: ScenePickerProps) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [activeTab, setActiveTab] = useState<SceneTab>('photos')

  // changing this number loads the list again (the Try again button uses it)
  const [reloadCount, setReloadCount] = useState(0)

  // keeps the newest onScenesLoaded in a ref so the list doesn't load again
  // every time the parent re-renders
  const onScenesLoadedRef = useRef(onScenesLoaded)
  useEffect(() => {
    onScenesLoadedRef.current = onScenesLoaded
  })

  // loads the scene list when the picker first shows up
  useEffect(() => {
    const controller = new AbortController()

    listScenes(controller.signal)
      .then((list) => {
        setScenes(list)
        setStatus('ready')
        onScenesLoadedRef.current(list)
      })
      .catch((error: unknown) => {
        // picker was closed before the request finished so there's nothing to update
        if (controller.signal.aborted) {
          return
        }

        console.error('Could not load scenes', error)
        setStatus('error')
      })

    // cancels the request if the picker closes before it's done
    return () => controller.abort()
  }, [reloadCount])

  // once the scenes load, pick the default one if nothing is selected yet
  // if Beach isn't there for some reason it just uses the first photo instead
  useEffect(() => {
    if (status !== 'ready' || selectedSceneId !== null) {
      return
    }

    const defaultScene =
      scenes.find((scene) => scene.name === DEFAULT_SCENE_NAME) ??
      scenes.find((scene) => scene.type === '2d')

    if (defaultScene) {
      onSelect(defaultScene)
    }
  }, [status, scenes, selectedSceneId, onSelect])

  // shows loading again and reloads the scenes after an error
  function tryAgain() {
    setStatus('loading')
    setReloadCount((count) => count + 1)
  }

  // still waiting on the backend
  if (status === 'loading') {
    return (
      <p role="status" className="text-sm text-[#526784]">
        Loading scenes…
      </p>
    )
  }

  // couldn't get the scenes (usually means the backend isn't running)
  if (status === 'error') {
    return (
      <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
        <p>Could not load scenes. Make sure the backend is running.</p>
        <button
          type="button"
          onClick={tryAgain}
          className="mt-2 font-semibold underline"
        >
          Try again
        </button>
      </div>
    )
  }

  // only photos and videos for now, 3d scenes will come later
  const photos = scenes.filter((scene) => scene.type === '2d')
  const videos = scenes.filter((scene) => scene.type === 'video')
  const visibleScenes = activeTab === 'photos' ? photos : videos

  return (
    <div className="space-y-3">

      {/* TABS: the selected one gets filled in so you can tell which one you're on */}
      <div
        role="group"
        aria-label="Scene type"
        className="inline-flex rounded-full bg-[#e7ecf4] p-1"
      >
        <TabButton
          label="Photos"
          isActive={activeTab === 'photos'}
          onClick={() => setActiveTab('photos')}
        />
        <TabButton
          label="Videos"
          isActive={activeTab === 'videos'}
          onClick={() => setActiveTab('videos')}
        />
      </div>

      {/* ROW OF SCENES: scrolls sideways if there are too many to fit */}
      {visibleScenes.length === 0 ? (
        <p className="text-sm text-[#526784]">
          No {activeTab} have been added yet.
        </p>
      ) : (
        <ul
          aria-label={activeTab === 'photos' ? 'Photo scenes' : 'Video scenes'}
          className="flex gap-3 overflow-x-auto pb-2"
        >
          {visibleScenes.map((scene) => (
            <li key={scene.id} className="w-36 shrink-0">
              <SceneCard
                scene={scene}
                isSelected={scene.id === selectedSceneId}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}

    </div>
  )
}

interface TabButtonProps {
  label: string
  isActive: boolean
  onClick: () => void
}

// one rounded tab button, the active one is dark blue and the other one is plain
function TabButton({ label, isActive, onClick }: TabButtonProps) {
  const activeStyle = isActive
    ? 'bg-[#304d82] text-white shadow-sm'
    : 'text-[#526784] hover:bg-white'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${activeStyle}`}
    >
      {label}
    </button>
  )
}

interface SceneCardProps {
  scene: Scene
  isSelected: boolean
  onSelect: (scene: Scene) => void
}

// one scene card you can click, shows a small preview and the scene name
function SceneCard({ scene, isSelected, onSelect }: SceneCardProps) {
  const fileUrl = sceneFileUrl(scene.id)

  const borderStyle = isSelected
    ? 'border-[#304d82] ring-2 ring-[#304d82]/30'
    : 'border-[#d8e0ed] hover:border-[#9fb0cc]'

  return (
    <button
      type="button"
      onClick={() => onSelect(scene)}
      aria-pressed={isSelected}
      className={`flex w-full flex-col overflow-hidden rounded-lg border-2 bg-white text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${borderStyle}`}
    >
      {scene.type === 'video' ? (
        // #t=0.5 makes the browser show the frame at 0.5 seconds as the thumbnail
        <video
          src={`${fileUrl}#t=0.5`}
          preload="metadata"
          muted
          playsInline
          aria-hidden="true"
          className="aspect-video w-full bg-[#1e2c49] object-cover"
        />
      ) : (
        // alt is empty cause the scene name is already written under the picture
        <img
          src={fileUrl}
          alt=""
          loading="lazy"
          className="aspect-video w-full bg-[#e7ecf4] object-cover"
        />
      )}

      <span className="truncate px-2 py-1.5 text-xs font-medium text-[#1e2c49]">
        {scene.name}
      </span>
    </button>
  )
}

export default ScenePicker
