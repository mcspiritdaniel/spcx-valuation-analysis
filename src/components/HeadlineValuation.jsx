import { formatPerShare } from '../utils/schema';

export default function HeadlineValuation({ perShareRounded }) {
  return (
    <header className="headline">
      <p className="headline__eyebrow">Implied per-share value</p>
      <p className="headline__value">{formatPerShare(perShareRounded)}</p>
    </header>
  );
}
