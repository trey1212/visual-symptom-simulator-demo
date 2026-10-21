import { useMemo, useState } from 'react'

import { sceneFileUrl } from '../../../api/scenes'
import type { Scene } from '../../../scenes/types'
import type { SymptomLayer } from '../../../symptoms/types'
import SymptomCanvas from './SymptomCanvas'

interface ScenePreviewProps {
  scene: Scene | null
  scenes: Scene[]
  layers: SymptomLayer[]
}

// shows the selected scene big with the symptom filters on it, either the photo or the video
function ScenePreview({ scene, scenes, layers }: ScenePreviewProps) {
  // keeps track of which scene's file didn't load so we can show an error instead
  const [failedSceneId, setFailedSceneId] = useState<string | null>(null)

  // every photo and video file, so the canvas can download them ahead of time
  // useMemo keeps the same list between renders so the canvas doesn't restart preloading
  const preloadMedia = useMemo(
    () =>
      scenes
        .filter((item) => item.type === '2d' || item.type === 'video')
        .map((item) => ({ url: sceneFileUrl(item.id), type: item.type })),
    [scenes],
  )

  // the default scene is still loading, so just show an empty box the same size
  // (that way the page doesn't jump when the picture shows up)
  if (scene === null) {
    return <div aria-hidden="true" className="aspect-video w-full rounded-lg bg-[#e7ecf4]" />
  }

  // the file for this scene didn't load
  if (failedSceneId === scene.id) {
    return (
      <div
        role="alert"
        className="flex aspect-video w-full items-center justify-center rounded-lg bg-red-50 p-4 text-center text-sm text-red-800"
      >
        This scene's file could not be loaded. Please choose another scene.
      </div>
    )
  }

  const fileUrl = sceneFileUrl(scene.id)

  return (
    // all the scenes are 16:9 so the frame is 16:9 too and stays the same size for every scene
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-[#e7ecf4]">
      {/* photos and videos both get drawn with pixi so the filters work on both */}
      <SymptomCanvas
        mediaUrl={fileUrl}
        mediaType={scene.type}
        label={scene.name}
        layers={layers}
        preloadMedia={preloadMedia}
        onError={() => setFailedSceneId(scene.id)}
      />
    </div>
  )
}

export default ScenePreview
