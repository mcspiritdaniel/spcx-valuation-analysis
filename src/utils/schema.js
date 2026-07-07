import schemaSource from '../../spcx_control_schema.json';

export function getSliderControls(schema = schemaSource) {
  return schema.controls.filter((c) => c.input_type === 'slider');
}

export function buildInitialValues(schema = schemaSource) {
  const values = {};
  for (const control of getSliderControls(schema)) {
    values[control.id] = control.value;
  }
  return values;
}

export function buildPatchedSchema(schema, values) {
  return {
    ...schema,
    controls: schema.controls.map((control) =>
      control.id in values ? { ...control, value: values[control.id] } : control
    ),
  };
}

export function formatSliderValue(value, unit) {
  switch (unit) {
    case 'percent':
      return `${(value * 100).toFixed(2)}%`;
    case 'ratio':
    case 'multiple':
      return value.toFixed(2);
    case 'usd':
      return `$${value.toFixed(0)}`;
    case 'usd_millions':
      return `$${value.toFixed(0)}M`;
    case 'millions':
      return `${value.toFixed(0)}M`;
    case 'megawatts':
      return `${Math.round(value).toLocaleString()} MW`;
    case 'year':
      return `${Math.round(value)}`;
    case 'years':
      return `${value.toFixed(1)} yr`;
    case 'count':
      return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
    default:
      return String(value);
  }
}

export function getSliderStep(min, max, unit) {
  if (unit === 'percent') return 0.0001;
  if (unit === 'year' || unit === 'years') return 0.1;
  if (unit === 'count') return 1;
  if (unit === 'multiple' || unit === 'ratio') return 0.1;

  const range = max - min;
  const raw = range / 200;

  if (raw >= 10) return Math.round(raw);
  if (raw >= 1) return Math.max(1, Number(raw.toFixed(1)));
  if (raw >= 0.01) return Number(raw.toFixed(2));
  return 0.001;
}

export function formatPerShare(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
