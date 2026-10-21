import type { Scene } from '../scenes/types'
import { apiFetch } from './client'

// gets all the active scenes from the backend
// signal is so the request can be cancelled if the component closes before it finishes
export function listScenes(signal?: AbortSignal): Promise<Scene[]> {
  return apiFetch<Scene[]>('/scenes', { signal })
}

// makes the url for a scene's image or video file
// encodeURIComponent so the id can't mess up the url
export function sceneFileUrl(sceneId: string): string {
  return `/api/scenes/${encodeURIComponent(sceneId)}/file`
}
