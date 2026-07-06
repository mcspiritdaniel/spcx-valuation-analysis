import SliderControl from './SliderControl';

const CARD_TITLES = {
  valuation_market_inputs: 'Valuation & Market Inputs',
  segment_card: 'Segment Inputs',
};

export default function SliderPanel({ title, controls, values, onChange, compact = false }) {
  if (!controls.length) return null;

  return (
    <section className={`slider-panel ${compact ? 'slider-panel--compact' : ''}`}>
      <h2>{title}</h2>
      <div className="slider-panel__grid">
        {controls.map((control) => (
          <SliderControl
            key={control.id}
            control={control}
            value={values[control.id]}
            onChange={onChange}
          />
        ))}
      </div>
    </section>
  );
}

export function groupSlidersByCard(sliders) {
  const groups = new Map();

  for (const control of sliders) {
    const card = control.home_card;
    if (!groups.has(card)) groups.set(card, []);
    groups.get(card).push(control);
  }

  return Array.from(groups.entries()).map(([card, controls]) => ({
    card,
    title: CARD_TITLES[card] ?? card,
    controls,
  }));
}
