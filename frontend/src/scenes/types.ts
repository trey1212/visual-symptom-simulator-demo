// a scene is the background the user picks, either a photo ('2d') or a video
export type SceneType = '2d' | '3d' | 'video'

// one scene, the fields match what GET /api/scenes sends back from the Go backend
export interface Scene {
  id: string
  name: string
  type: SceneType
  asset_path: string
  is_active: boolean
  created_at: string
}
