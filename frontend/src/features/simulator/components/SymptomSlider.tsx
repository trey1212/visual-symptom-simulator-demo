interface SymptomSliderProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

// Reusable slider component
function SymptomSlider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: SymptomSliderProps) {
  return (
    <div className="space-y-2">

      {/* Slider label and current value */}
      <div className="flex justify-between gap-2 text-sm">

        <label
          htmlFor={id}
          className="font-semibold text-[#526784]"
        >
          {label}
        </label>

        <output
          htmlFor={id}
          className="font-bold text-[#1e2c49]"
        >
          {value}{unit}
        </output>

      </div>

      {/* Actual slider */}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}

        // Update the value when moved
        onChange={(e) =>
          onChange(Number(e.target.value))
        }

        className="w-full cursor-pointer accent-[#304d82]"
      />

    </div>
  )
}

export default SymptomSlider
