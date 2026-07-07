import { formatSliderValue, getSliderStep } from '../utils/schema';

export default function SliderControl({ control, value, onChange, formatOverride }) {
  const { min, max, unit, step: schemaStep } = control.range;
  const step = getSliderStep(min, max, unit, schemaStep);
  const displayValue = formatOverride ? formatOverride(value) : formatSliderValue(value, unit);

  return (
    <label className="slider-control">
      <div className="slider-control__header">
        <span className="slider-control__label">{control.display_label || control.label}</span>
        <span className="slider-control__value">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(control.id, Number(e.target.value))}
      />
    </label>
  );
}
