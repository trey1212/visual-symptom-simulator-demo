import { useState } from 'react'

import ScenePicker from '../simulator/components/ScenePicker'
import ScenePreview from '../simulator/components/ScenePreview'
import SymptomPanel from '../simulator/components/SymptomPanel'
import type { Scene } from '../../scenes/types'
import type { SymptomLayer } from '../../symptoms/types'

function ClinicalConsole() {

  // the scene (photo or video) that the symptoms get shown on
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)

  // all the scenes from the backend (the preview downloads them ahead of time)
  const [allScenes, setAllScenes] = useState<Scene[]>([])

  // Current symptom settings
  // The values are stored here so they can be
  // passed to the WebGL2 renderer later.
  const [layers, setLayers] = useState<SymptomLayer[]>([
    {
      instanceId: 'diplopia-1',
      symptomId: 'diplopia',
      enabled: false,
      values: {
        angle: 0,
        offset: 2,
        opacity: 50,
      },
    },
    {
      instanceId: 'scotoma-1',
      symptomId: 'scotoma',
      enabled: false,
      values: {
        spotSize: 25,
      },
    },
  ])

  return (
    <div className="min-h-dvh bg-[#e7ecf4]">

      {/* HEADER */}
      <header className="flex h-20 items-center bg-[#1e2c49] px-6 text-white">
        <h1 className="text-xl font-semibold">
          VSS Clinical Console
        </h1>
      </header>

      {/* THREE-COLUMN LAYOUT: the sides have a fixed width and the middle (scene preview) takes up the rest */}
      <main className="grid grid-cols-1 items-stretch gap-4 p-4 lg:grid-cols-[17rem_minmax(0,1fr)_14rem] xl:grid-cols-[19rem_minmax(0,1fr)_16rem]">

        {/* LEFT COLUMN */}
        <aside className="min-h-[500px] rounded-xl bg-white p-5 shadow-sm lg:min-h-[calc(100dvh-112px)]">

          <SymptomPanel
            layers={layers}
            onLayersChange={setLayers}
          />

        </aside>

        {/* MIDDLE COLUMN */}
        <section className="min-h-[500px] rounded-xl bg-white p-5 shadow-sm lg:min-h-[calc(100dvh-112px)]">

          <h2 className="mb-4 font-semibold text-[#526784]">
            SCENE PREVIEW
          </h2>

          <div className="space-y-4">
            <ScenePicker
              selectedSceneId={selectedScene?.id ?? null}
              onSelect={setSelectedScene}
              onScenesLoaded={setAllScenes}
            />

            {/* the WebGL2 renderer will draw the symptom filters on top of this later */}
            <ScenePreview scene={selectedScene} scenes={allScenes} layers={layers} />
          </div>

        </section>

        {/* RIGHT COLUMN */}
        <aside className="flex flex-col gap-4">

          {/* PATIENT MAPPING */}
          <div className="min-h-48 rounded-xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-[#526784]">
              PATIENT-REPORTED MAPPING
            </h2>
          </div>

          {/* SAVE & EXPORT */}
          <div className="min-h-44 rounded-xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-[#526784]">
              SAVE &amp; EXPORT
            </h2>
          </div>

          {/* SESSION HISTORY */}
          <div className="min-h-44 rounded-xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-[#526784]">
              SESSION HISTORY
            </h2>
          </div>

        </aside>

      </main>
    </div>
  )
}

export default ClinicalConsole
