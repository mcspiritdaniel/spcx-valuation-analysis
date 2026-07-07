import { useState } from 'react';
import { formatSliderValue, getSliderStep } from '../utils/schema';

export default function SliderControl({ control, value, onChange, formatOverride }) {
  const { min, max, unit } = control.range;
  const step = getSliderStep(min, max, unit);
  const displayValue = formatOverride ? formatOverride(value) : formatSliderValue(value, unit);
  const [inputValue, setInputValue] = useState(value.toString());

  const handleSliderChange = (e) => {
    const newValue = Number(e.target.value);
    onChange(control.id, newValue);
    setInputValue(newValue.toString());
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    let newValue = parseFloat(inputValue);
    if (isNaN(newValue)) {
      newValue = value;
    } else {
      newValue = Math.max(min, Math.min(max, newValue));
    }
    onChange(control.id, newValue);
    setInputValue(newValue.toString());
  };

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
        onChange={handleSliderChange}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        className="slider-control__input"
      />
    </label>
  );
}
