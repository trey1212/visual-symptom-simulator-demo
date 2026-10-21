import type {
  ParamValue,
  SymptomLayer,
} from '../../../symptoms/types'

import SymptomSlider from './SymptomSlider'

interface SymptomPanelProps {
  layers: SymptomLayer[]
  onLayersChange: (layers: SymptomLayer[]) => void
}

function SymptomPanel({
  layers,
  onLayersChange,
}: SymptomPanelProps) {

  // Find a symptom by its ID
  function getLayer(id: string) {
    return layers.find(
      (layer) => layer.symptomId === id
    )
  }

  // Get the current slider value
  function getValue(
    layer: SymptomLayer | undefined,
    key: string,
    fallback: number
  ) {
    const value = layer?.values[key]

    return typeof value === 'number'
      ? value
      : fallback
  }

  // Turn a symptom ON or OFF
  function toggleSymptom(id: string) {
    onLayersChange(
      layers.map((layer) =>
        layer.symptomId === id
          ? { ...layer, enabled: !layer.enabled }
          : layer
      )
    )
  }

  // Update a slider value
  function updateParameter(
    id: string,
    key: string,
    value: ParamValue
  ) {
    onLayersChange(
      layers.map((layer) =>
        layer.symptomId === id
          ? {
              ...layer,
              values: {
                ...layer.values,
                [key]: value,
              },
            }
          : layer
      )
    )
  }

  // Get the current symptoms
  const diplopia = getLayer('diplopia')
  const scotoma = getLayer('scotoma')

  return (
    <div>

      <h2 className="mb-6 text-lg font-bold text-[#526784]">
        SYMPTOM PARAMETERS
      </h2>

      <div className="space-y-4">

        {/* DIPLOPIA CARD */}
        <div className="rounded-xl border border-[#d8e0ed] bg-white p-5">

          <div className="flex items-center justify-between gap-3">

            <h3 className="text-lg font-semibold text-[#1e2c49]">
              Diplopia
            </h3>

            {/* Diplopia toggle */}
            <label className="relative inline-flex cursor-pointer items-center">

              <input
                type="checkbox"
                checked={diplopia?.enabled ?? false}
                onChange={() => toggleSymptom('diplopia')}
                className="peer sr-only"
                aria-label="Enable Diplopia"
              />

              <span className="h-7 w-12 rounded-full bg-[#b9c5d9] transition-colors peer-checked:bg-[#304d82] peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400" />

              <span className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />

            </label>
          </div>

          {/* Show sliders when Diplopia is ON */}
          {diplopia?.enabled && (
            <div className="mt-6 space-y-5 border-t border-slate-100 pt-5">

              <SymptomSlider
                id="diplopia-angle"
                label="Angle"
                value={getValue(diplopia, 'angle', 0)}
                min={0}
                max={360}
                unit="°"
                onChange={(value) =>
                  updateParameter('diplopia', 'angle', value)
                }
              />

              {/* how far apart the two images are, as a % of the picture width */}
              <SymptomSlider
                id="diplopia-offset"
                label="Distance Apart"
                value={getValue(diplopia, 'offset', 2)}
                min={0}
                max={20}
                step={0.5}
                unit="%"
                onChange={(value) =>
                  updateParameter('diplopia', 'offset', value)
                }
              />

              {/* how see-through the second image is, 0 = invisible and 100 = solid */}
              <SymptomSlider
                id="diplopia-opacity"
                label="Ghost Strength"
                value={getValue(diplopia, 'opacity', 50)}
                min={0}
                max={100}
                unit="%"
                onChange={(value) =>
                  updateParameter('diplopia', 'opacity', value)
                }
              />

            </div>
          )}

        </div>

        {/* SCOTOMA CARD */}
        <div className="rounded-xl border border-[#d8e0ed] bg-white p-5">

          <div className="flex items-center justify-between gap-3">

            <h3 className="text-lg font-semibold text-[#1e2c49]">
              Scotoma
            </h3>

            {/* Scotoma toggle */}
            <label className="relative inline-flex cursor-pointer items-center">

              <input
                type="checkbox"
                checked={scotoma?.enabled ?? false}
                onChange={() => toggleSymptom('scotoma')}
                className="peer sr-only"
                aria-label="Enable Scotoma"
              />

              <span className="h-7 w-12 rounded-full bg-[#b9c5d9] transition-colors peer-checked:bg-[#304d82] peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400" />

              <span className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />

            </label>
          </div>

          {/* Show slider when Scotoma is ON */}
          {scotoma?.enabled && (
            <div className="mt-6 border-t border-slate-100 pt-5">

              <SymptomSlider
                id="scotoma-size"
                label="Spot Size"
                value={getValue(scotoma, 'spotSize', 25)}
                min={0}
                max={100}
                unit="%"
                onChange={(value) =>
                  updateParameter('scotoma', 'spotSize', value)
                }
              />

            </div>
          )}

        </div>

      </div>
    </div>
  )
}

export default SymptomPanel
