import { Fragment } from 'react';
import SliderControl from './components/SliderControl';
import SegmentChart from './components/SegmentChart';
import { useValuationEngine } from './hooks/useValuationEngine';
import { formatSliderValue, getSliderStep } from './utils/schema';
import unlockSchedule from '../unlock_schedule.json';
import './App.css';

const perShareFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const shareCountFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// Reference constant only -- disclosed IPO price, does not feed any calculation.
const IPO_REFERENCE_PRICE = 135;

function formatMoneyM(value) {
  const sign = value < 0 ? '–' : '';
  return `${sign}$${Math.round(Math.abs(value)).toLocaleString()}M`;
}

function formatShares(value) {
  return `${shareCountFormat.format(value)}M`;
}

function formatPct(value, decimals = 2) {
  return `${(value * 100).toFixed(decimals)}%`;
}

function formatMultiple(value) {
  return `${value.toFixed(2)}×`;
}

function formatYears(value) {
  return `${value.toFixed(1)} yr`;
}

function formatBillionsFromMillions(valueInMillions) {
  return `$${Math.round(valueInMillions / 1000).toLocaleString()}B`;
}

function byRow(controls, row) {
  return controls.find((c) => c.row === row);
}

function groupByCategory(controls, order, labelOverrides = {}) {
  const map = new Map();
  for (const control of controls) {
    const label = labelOverrides[control.category] || control.category;
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(control);
  }
  const ordered = [];
  for (const label of order) {
    if (map.has(label)) {
      ordered.push([label, map.get(label)]);
      map.delete(label);
    }
  }
  for (const entry of map) ordered.push(entry);
  return ordered;
}

function sharedCaption(control) {
  if (!Array.isArray(control.shared_with_segments) || !control.shared_with_segments.length) return null;
  return `Shared · ${[control.segment, ...control.shared_with_segments].join(' / ')}`;
}

function buildSegmentPanels(sliders) {
  const valuationInputs = sliders.filter((control) => control.home_card === 'valuation_market_inputs');
  const segmentInputs = sliders.filter((control) => control.home_card === 'segment_card');

  const bySegment = new Map([
    ['Space', []],
    ['Connectivity', []],
    ['AI', []],
    ['Expansion', []],
  ]);

  for (const control of segmentInputs) {
    if (bySegment.has(control.segment)) {
      bySegment.get(control.segment).push(control);
    }

    if (Array.isArray(control.shared_with_segments)) {
      for (const sharedSegment of control.shared_with_segments) {
        if (bySegment.has(sharedSegment)) {
          bySegment.get(sharedSegment).push(control);
        }
      }
    }
  }

  return {
    valuationInputs,
    segmentPanels: Array.from(bySegment.entries()).map(([segment, controls]) => ({
      segment,
      controls,
    })),
  };
}

const SEGMENT_CATEGORY_ORDER = {
  Space: ['External launch growth', 'Launch pricing', 'Operating margin', 'Capital spending', 'Working capital'],
  Connectivity: ['Subscription service growth', 'Subscriber pricing', 'Non-subscriber revenue', 'Operating margin', 'Capital spending', 'Working capital'],
  AI: ['Megawatt growth', 'Pricing', 'Operating margin', 'Capital spending', 'Working capital', 'Contract risk'],
  Expansion: ['Segment weighting', 'Timing and payoff shape', 'Capital spending', 'Working capital', 'Best/worst-case scenarios', 'Phased growth'],
};

const SEGMENT_CATEGORY_LABEL_OVERRIDES = {
  AI: { 'Total addressable market': 'Contract risk' },
};

const SEGMENT_DESCRIPTIONS = {
  Space: "Space combines a launch-volume S-curve — growth that accelerates, then tapers as the business approaches its ceiling — with a steadily rising price per launch, and margins that improve in step with how fast the business actually scales rather than on a fixed timeline. Because Space's revenue leans heavily on government launch contracts which are the most stable, least market-sensitive part of the business it carries the most conservative risk profile of the four segments.",
  Connectivity: "Connectivity uses the same S-curve growth pattern as Space — subscribers ramping toward a ceiling — paired with per-subscriber revenue that gradually declines as the base matures, and a hardware-revenue layer that fades as fewer subscribers are buying their first terminal each year. It's treated as the most proven, lowest-risk segment of the four, reflecting the fastest subscriber scale-up of any satellite internet provider to date and it's the single largest driver of the company's total value.",
  AI: "AI combines the same S-curve capacity growth used across the other segments with something more concrete: a real split between contracted revenue from named, disclosed compute agreements and merchant revenue for whatever capacity isn't already spoken for, so expiring contracts automatically roll into re-priced capacity rather than requiring a separate assumption. It carries the least-proven risk profile of the three real segments, reflecting a competitive field with better-funded, more established rivals.",
  Expansion: "Expansion values future products that don't exist yet. It only starts contributing once Space, Connectivity, and AI have matured enough to support something built on top of them, weighted toward whichever platform the company is actually investing in most. Rather than a single estimate, three scenarios (bearish, base, bullish) are blended into one expected outcome, and growth fades gradually toward a steady pace using a phased-growth approach (H-model), reflecting a genuinely long investment horizon.",
};

function GridCell({ control, value, onChange }) {
  const { min, max, unit, step: schemaStep } = control.range;
  const step = getSliderStep(min, max, unit, schemaStep);
  return (
    <div className="vmi-cell">
      <span className="vmi-cell__value">{formatSliderValue(value, unit)}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(control.id, Number(e.target.value))}
      />
    </div>
  );
}

function StaticCell({ value, caption }) {
  return (
    <div className="vmi-cell vmi-cell--static">
      <span className="vmi-cell__value vmi-cell__value--muted">{value}</span>
      {caption && <span className="vmi-cell__caption">{caption}</span>}
    </div>
  );
}

function BridgeRow({ label, value, formatter = formatMoneyM, total = false, highlight = false }) {
  const negative = value < 0;
  return (
    <div className={`bridge-row${total ? ' bridge-row--total' : ''}${highlight ? ' bridge-row--highlight' : ''}`}>
      <span>{label}</span>
      <strong className={negative ? 'bridge-row--neg' : ''}>{formatter(value)}</strong>
    </div>
  );
}

function SegmentStaticRow({ label, value }) {
  return (
    <div className="segment-static-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function App() {
  const { values, updateValue, resetToDefaults, sliders, result, perShareRounded } = useValuationEngine();
  const { valuationInputs, segmentPanels } = buildSegmentPanels(sliders);
  const { valuation, ev, wacc, operating, expansionDiagnostics } = result;
  const spread = valuation.roicWaccSpread;

  const segmentEV = {
    Space: ev.space.enterpriseValue,
    Connectivity: ev.connectivity.enterpriseValue,
    AI: ev.ai.enterpriseValue,
    Expansion: ev.expansion.enterpriseValue,
  };

  return (
    <div className="app">
      <div className="app__topbar" />

      <nav className="navbar">
        <div className="navbar__brand">
          <span className="navbar__mark">SPCX</span>
          <span className="navbar__divider" />
          <span className="navbar__subtitle">Space Exploration Technologies Corp.</span>
        </div>
        <div className="navbar__right">
          <span className="navbar__label">Valuation Analysis</span>
          <button className="reset-btn" onClick={resetToDefaults}>Reset to model defaults</button>
          <a className="navbar__link" href="https://danmcspirit.com" target="_blank" rel="noreferrer">Dan McSpirit &#8599;</a>
        </div>
      </nav>

      <div className="mobile-notice">
        <div className="mobile-notice__wordmark">SPCX</div>
        <h1 className="mobile-notice__heading">Best Viewed on Desktop</h1>
        <p className="mobile-notice__text">
          This is a dense, interactive sum-of-the-parts valuation model with 60+ adjustable assumptions across a two-pane layout. It's built for a larger screen — please revisit on a desktop or laptop for the full experience.
        </p>
        <a href="https://danmcspirit.com" target="_blank" rel="noreferrer" className="mobile-notice__link">Dan McSpirit &#8599;</a>
      </div>

      <section className="hero-row">
        <div className="hero-col">
          <div className="hero-col__label">Equity Value &middot; Per Share &middot; Rounded to Nearest USD</div>
          <div>
            <div className="hero-col__price">{perShareFormat.format(perShareRounded)}</div>
          </div>
          <div className="hero-col__footnote">Not investment advice</div>
        </div>
        <div className="method-col">
          <div>
            <div className="method-col__title">Model Methodology &amp; Mechanics</div>
            <p className="method-col__text">
              A sum-of-the-parts valuation: Space, Connectivity, AI, and Expansion business segments are each valued
              independently, at their own cost of capital, rather than treating SpaceX as a single business with a
              single discount rate. Wherever possible, growth is grounded in what&apos;s actually disclosed; where it
              isn&apos;t &mdash; Expansion, the one segment representing products that don&apos;t exist yet &mdash;
              it is priced as a convex, option-like payoff across Bear/Base/Bull scenarios rather than a single
              estimate.
            </p>
            <p className="method-col__text">
              WACC uses a fixed capital structure weight rather than solving it live to avoid circularity.
            </p>
            <p className="method-col__text">
              Each segment&apos;s after-tax cash flow is not fully isolated, however: cash taxes are computed on
              consolidated EBIT (SpaceX files one tax return, not four), so a change in one segment&apos;s inputs can
              shift another&apos;s after-tax cash flow via the shared effective tax rate. A separate, and potentially much
              larger, cross-segment effect exists for Expansion specifically. See its card for detail.
            </p>
          </div>
          <div className="method-col__footnote">Model defaults are starting values only &middot; All figures USD million unless noted</div>
        </div>
      </section>

      <section className="vmi-section">
        <div className="vmi-heading">Valuation &amp; Market Inputs</div>
        <div className="vmi-columns">
          <div className="vmi-col-capital">
            <div className="vmi-group-title">Costs of Capital</div>
            {[7, 8, 9].map((row) => {
              const control = byRow(valuationInputs, row);
              return (
                <SliderControl key={control.id} control={control} value={values[control.id]} onChange={updateValue} />
              );
            })}

            <div className="vmi-divider" />
            <div className="vmi-group-title">M&amp;A</div>
            {(() => {
              const control = byRow(valuationInputs, 46);
              return (
                <SliderControl key={control.id} control={control} value={values[control.id]} onChange={updateValue} />
              );
            })()}
          </div>

          <div className="vmi-col-grid">
            <div className="vmi-grid-title">Risk, Growth and Reinvestment Rate</div>
            <div className="vmi-grid-header">
              <div />
              <div>Space</div>
              <div>Connectivity</div>
              <div>AI</div>
              <div>Expansion</div>
            </div>

            <div className="vmi-grid-row">
              <span>Beta</span>
              {[12, 13, 14, 15].map((row) => {
                const control = byRow(valuationInputs, row);
                return <GridCell key={control.id} control={control} value={values[control.id]} onChange={updateValue} />;
              })}
            </div>

            <div className="vmi-grid-row">
              <span>Risk Premium</span>
              {[18, 19, 20, 21].map((row) => {
                const control = byRow(valuationInputs, row);
                return <GridCell key={control.id} control={control} value={values[control.id]} onChange={updateValue} />;
              })}
            </div>

            <div className="vmi-grid-row">
              <span>Terminal Growth</span>
              {[30, 31, 32, 33].map((row) => {
                const control = byRow(valuationInputs, row);
                return <GridCell key={control.id} control={control} value={values[control.id]} onChange={updateValue} />;
              })}
            </div>

            <div className="vmi-grid-row vmi-grid-row--reinvest">
              <span>Terminal Reinvest. Rate</span>
              {[36, 37, 38].map((row) => {
                const control = byRow(valuationInputs, row);
                return <GridCell key={control.id} control={control} value={values[control.id]} onChange={updateValue} />;
              })}
              <StaticCell value={formatPct(expansionDiagnostics.rrExp, 1)} caption="g ÷ WACC" />
            </div>

            <div className="vmi-grid-row vmi-grid-row--wacc">
              <span>Resulting WACC</span>
              <div className="vmi-cell vmi-cell--static"><span className="vmi-cell__value">{formatPct(wacc.space)}</span></div>
              <div className="vmi-cell vmi-cell--static"><span className="vmi-cell__value">{formatPct(wacc.connectivity)}</span></div>
              <div className="vmi-cell vmi-cell--static"><span className="vmi-cell__value">{formatPct(wacc.ai)}</span></div>
              <div className="vmi-cell vmi-cell--static"><span className="vmi-cell__value">{formatPct(wacc.expansion)}</span></div>
            </div>
          </div>

          <div className="vmi-col-roic">
            <div className="vmi-group-title">Steady State ROIC vs. WACC &middot; Spread</div>
            <table className="roic-table">
              <thead>
                <tr>
                  <th>Segment</th>
                  <th>ROIC<sub>ss</sub></th>
                  <th>WACC</th>
                  <th>Spread</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Space</td>
                  <td>{formatPct(spread.space.roicSS || 0)}</td>
                  <td>{formatPct(spread.space.wacc || 0)}</td>
                  <td>{formatPct(spread.space.spread || 0)}</td>
                </tr>
                <tr>
                  <td>Connectivity</td>
                  <td>{formatPct(spread.connectivity.roicSS || 0)}</td>
                  <td>{formatPct(spread.connectivity.wacc || 0)}</td>
                  <td>{formatPct(spread.connectivity.spread || 0)}</td>
                </tr>
                <tr>
                  <td>AI</td>
                  <td>{formatPct(spread.ai.roicSS || 0)}</td>
                  <td>{formatPct(spread.ai.wacc || 0)}</td>
                  <td>{formatPct(spread.ai.spread || 0)}</td>
                </tr>
                <tr>
                  <td className="roic-table__expansion-label">Expansion</td>
                  <td colSpan={3} className="roic-table__expansion-note">
                    Expansion's reinvestment rate is defined as g &divide; WACC, not independently sourced. ROIC<sub>ss</sub> equals WACC by construction. Spread here is a structural identity, not a forecast.
                    <br />
                    <span className="roic-table__ss-caption">ss = steady state</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="roic-reconciliation-note">
              A positive ROIC<sub>ss</sub>–WACC spread reflects steady-state (mature) unit economics, not the full
              valuation. A segment can still show negative Enterprise Value if the cost of reaching that mature
              state — years of capex and low-margin buildout, for example — outweighs its eventual payoff at this segment&apos;s cost of
              capital.
            </p>
          </div>
        </div>
      </section>

      <section className="segments-section">
        <div className="segments-heading">Segment Analysis</div>
        <div className="segments-grid">
          {segmentPanels.map((panel) => {
            const order = SEGMENT_CATEGORY_ORDER[panel.segment];
            const overrides = SEGMENT_CATEGORY_LABEL_OVERRIDES[panel.segment] || {};
            const groups = groupByCategory(panel.controls, order, overrides);
            const evValue = segmentEV[panel.segment];

            return (
              <div className="segment-col" key={panel.segment}>
                <div className="segment-col__name">{panel.segment}</div>
                <div className="segment-col__ev">{formatMoneyM(evValue)}</div>
                <div className="segment-col__ev-label">Enterprise value</div>

                {evValue < 0 && (
                  <div className="segment-col__warning">
                    At these settings, the expected returns do not cover the cost of capital, resulting in a net drag
                    on equity value.
                  </div>
                )}

                <p className="segment-col__description">{SEGMENT_DESCRIPTIONS[panel.segment]}</p>

                {groups.map(([category, controls]) => (
                  <div className="segment-group" key={category}>
                    <div className="segment-group__label">{category}</div>
                    {controls.map((control) => (
                      <div key={control.id}>
                        <SliderControl
                          control={control}
                          value={values[control.id]}
                          onChange={updateValue}
                          formatOverride={control.row === 153 ? formatBillionsFromMillions : undefined}
                        />
                        {sharedCaption(control) && <div className="segment-shared-caption">{sharedCaption(control)}</div>}
                      </div>
                    ))}

                    {panel.segment === 'Expansion' && category === 'Segment weighting' && (
                      <SegmentStaticRow
                        label="Connectivity — residual"
                        value={formatPct(expansionDiagnostics.connWeightResidual, 1)}
                      />
                    )}

                    {panel.segment === 'Expansion' && category === 'Timing and payoff shape' && (
                      <SegmentStaticRow
                        label="Revenue scale — calculated"
                        value={formatMoneyM(operating.expansion.revenueScale)}
                      />
                    )}

                    {panel.segment === 'Expansion' && category === 'Best/worst-case scenarios' && (
                      <div className="segment-scenario-table">
                        <div className="segment-scenario-cell">
                          <div className="segment-scenario-cell__label">Bear</div>
                          <div className="segment-scenario-cell__value">{formatMultiple(expansionDiagnostics.scenarioMultBear)}</div>
                          <div className="segment-scenario-cell__value">{Math.round(expansionDiagnostics.probBear * 100)}%</div>
                        </div>
                        <div className="segment-scenario-cell segment-scenario-cell--mid">
                          <div className="segment-scenario-cell__label">Base</div>
                          <div className="segment-scenario-cell__value">{formatMultiple(expansionDiagnostics.scenarioMultBase)}</div>
                          <div className="segment-scenario-cell__value">{Math.round(expansionDiagnostics.probBase * 100)}%</div>
                        </div>
                        <div className="segment-scenario-cell">
                          <div className="segment-scenario-cell__label">Bull</div>
                          <div className="segment-scenario-cell__value">{formatMultiple(expansionDiagnostics.scenarioMultBull)}</div>
                          <div className="segment-scenario-cell__value">{Math.round(expansionDiagnostics.probBull * 100)}%</div>
                        </div>
                      </div>
                    )}

                    {panel.segment === 'Expansion' && category === 'Phased growth' && (
                      <>
                        <SegmentStaticRow label="Growth half-life" value={formatYears(expansionDiagnostics.growthHalfLife)} />
                        <SegmentStaticRow label="Starting growth — calculated" value={formatPct(expansionDiagnostics.startingGrowth)} />
                      </>
                    )}
                  </div>
                ))}

                {panel.segment === 'Space' && (
                  <>
                    <SegmentChart segment="Space" primaryLabel="Launches" primaryData={operating.space.launches} margin={operating.space.margin} />
                    <div className="footnotes">
                      <p>Note: raising Annual Cadence Target lifts Space's long-run revenue ceiling, but can slow near-term margin improvement. The model measures ramp progress as a fraction of the target, so a higher target makes the same launch volume represent less progress toward maturity.</p>
                    </div>
                  </>
                )}

                {panel.segment === 'Connectivity' && (
                  <>
                    <SegmentChart segment="Connectivity" primaryLabel="Subscribers" primaryData={operating.connectivity.subscribers} margin={operating.connectivity.margin} />
                    <div className="footnotes">
                      <p>Note: Hardware revenue decline rate is applied as a constant percentage of subscriber revenue each year, not a cumulative year-over-year decline. Its effect on 10-year hardware revenue is smaller than 'decline rate' might suggest.</p>
                    </div>
                  </>
                )}

                {panel.segment === 'AI' && (
                  <>
                    <SegmentChart segment="AI" primaryLabel="Megawatts" primaryData={operating.ai.capacity} margin={operating.ai.margin} />
                    <div className="footnotes">
                      <p>Note: at a low merchant Price per MW, increasing Contract Termination Risk can raise AI's value. Losing contracted revenue during AI's deeply negative-margin early years reduces near-term losses more than it costs in future merchant revenue.</p>
                    </div>
                  </>
                )}

                {panel.segment === 'Expansion' && (
                  <>
                    <SegmentChart segment="Expansion" primaryLabel="Revenue" primaryData={operating.expansion.revenue} margin={operating.expansion.margin} />
                    <div className="footnotes">
                      <p>Note: Space and AI's segment weightings are linked — increasing one reduces the other's available range. Connectivity's weight is the residual (100% − Space − AI), which must stay between 0% and 100% to remain meaningful.</p>
                    </div>
                    <div className="footnotes">
                      <p>Note: Expansion's Revenue = a weighted composite of Space, Connectivity, and AI's realization curves — this does depend on the segment weightings above. Expansion's Margin = blended dollar EBIT ÷ dollar revenue across all three segments — this does not depend on weighting at all. Even at 0% AI weighting, a large change in AI's absolute profitability can still meaningfully shift Expansion's margin and value.</p>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="output-section">
        <div className="output-heading">Capital Structure &amp; Valuation Output</div>
        <div className="output-grid">
          <div className="output-col">
            <div className="output-col__title">Equity Value</div>
            <BridgeRow label="EV — Space" value={segmentEV.Space} />
            <BridgeRow label="EV — Connectivity" value={segmentEV.Connectivity} />
            <BridgeRow label="EV — AI" value={segmentEV.AI} />
            <BridgeRow label="EV — Expansion" value={segmentEV.Expansion} />
            <BridgeRow label="Total EV" value={valuation.totalEV} total />
            <BridgeRow label="(+) Net cash" value={valuation.netCash} />
            <BridgeRow label="(+) Anysphere acquisition" value={valuation.anysphereEV} />
            <BridgeRow label="(–) EchoStar/Spectrum" value={valuation.echoStarCommitment} />
            <BridgeRow label="Equity value" value={valuation.equityValue} total />
            <BridgeRow label="÷ Diluted shares" value={valuation.dilutedShares} formatter={formatShares} />
            <div className="bridge-row bridge-row--highlight">
              <span>Intrinsic value / share (rounded)</span>
              <strong>{perShareFormat.format(valuation.perShareRounded)}</strong>
            </div>
            <div className="bridge-row bridge-row--muted">
              <span>IPO price (reference)</span>
              <strong>{perShareFormat.format(IPO_REFERENCE_PRICE)}</strong>
            </div>
          </div>

          <div className="output-col">
            <div className="output-col__title">Net Cash Bridge</div>
            <BridgeRow label="Cash, PF (3/31/26, pre-IPO)" value={valuation.cashPF} />
            <BridgeRow label="(+) IPO net proceeds" value={valuation.ipoProceeds} />
            <BridgeRow label="(+) Bond proceeds" value={valuation.bondProceeds} />
            <BridgeRow label="(–) Repay SpaceX bridge loan" value={valuation.bridgeRepay} />
            <BridgeRow label="Cash, post all" value={valuation.cashPostAll} total />
            <BridgeRow label="Total debt, PF" value={valuation.debtPF} />
            <BridgeRow label="(–) Bridge repaid" value={valuation.bridgeRepaidAgain} />
            <BridgeRow label="(+) New senior notes" value={valuation.newSeniorNotes} />
            <BridgeRow label="Total debt, post all" value={valuation.debtPostAll} total />
            <div className="bridge-row bridge-row--highlight">
              <span>Net cash</span>
              <strong>{formatMoneyM(valuation.netCash)}</strong>
            </div>
          </div>

          <div className="output-col">
            <div className="output-col__title">Share Count Bridge</div>
            <BridgeRow label="Class A, post-IPO (incl. over-allotment)" value={valuation.classA} formatter={formatShares} />
            <BridgeRow label="Class B" value={valuation.classB} formatter={formatShares} />
            <BridgeRow label="Total Class A + B" value={valuation.totalClassAB} formatter={formatShares} total />
            <BridgeRow label="(+) Anysphere (all-stock @ $135 VWAP)" value={valuation.anysphereShares} formatter={formatShares} />
            <BridgeRow label="(+) EchoStar/Spectrum consideration" value={valuation.echoStarShares} formatter={formatShares} />
            <BridgeRow label="Total basic shares" value={valuation.totalBasicShares} formatter={formatShares} total />
            <BridgeRow label="(+) Options (treasury, net @ $135)" value={valuation.options} formatter={formatShares} />
            <BridgeRow label="(+) RSUs (full)" value={valuation.rsus} formatter={formatShares} />
            <div className="bridge-row bridge-row--highlight">
              <span>Diluted shares</span>
              <strong>{formatShares(valuation.dilutedShares)}</strong>
            </div>
          </div>

          <div className="output-col">
            <div className="output-col__title">Unlock Schedule</div>
            <div className="unlock-grid">
              <div className="unlock-grid__header">Event / Date</div>
              <div className="unlock-grid__header unlock-grid__header--num">Cumul. (M)</div>
              {unlockSchedule.schedule.map((item) => (
                <Fragment key={item.event}>
                  <div className="unlock-grid__cell">{item.event}</div>
                  <div className="unlock-grid__cell unlock-grid__cell--num">
                    {shareCountFormat.format(item.cumulativeShares)}
                  </div>
                </Fragment>
              ))}
            </div>
            <div className="footnotes">
              {unlockSchedule.footnotes.map((footnote) => (
                <p key={footnote}>{footnote}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="app-footer">
        <div className="app-footer__left">
          <a href="https://danmcspirit.com" target="_blank" rel="noreferrer">Dan McSpirit &#8599;</a>
        </div>
        <span className="app-footer__center">For informational purposes only &middot; Not investment advice</span>
        <span className="app-footer__right">July 2026</span>
      </footer>
    </div>
  );
}
