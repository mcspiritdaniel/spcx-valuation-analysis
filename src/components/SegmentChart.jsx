import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function CustomLegend(props) {
  const { payload } = props;
  if (!payload || payload.length === 0) {
    return null;
  }
  return (
    <div style={{ fontSize: '12px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '20px', width: '100%', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
      {payload.map((entry, index) => {
        let label = entry.name || entry.value;
        if (label && label.startsWith('z ')) {
          label = label.substring(2);
        }
        return (
          <span key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                backgroundColor: entry.color,
                borderRadius: '2px',
              }}
            />
            <span>{label}</span>
          </span>
        );
      })}
    </div>
  );
}

export default function SegmentChart({ primaryLabel, primaryData, margin, segment }) {
  const years = Array.from({ length: 10 }, (_, i) => 2026 + i);
  const primaryKey = primaryLabel.toLowerCase();
  const data = years.map((year, i) => ({
    year,
    [primaryKey]: Math.round(primaryData[i + 1] * 100) / 100,
    margin: Math.round(margin[i + 1] * 10000) / 100,
  }));

  const formatAxisValue = (value) => {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const marginLabel = (segment === 'Connectivity' || segment === 'Expansion') ? 'z Operating Margin' : 'Operating Margin';

  return (
    <div className="segment-chart">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 15, left: 30, bottom: 5 }}>
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11 }}
            stroke="var(--navy-light)"
            type="number"
            tickFormatter={(value) => value.toString()}
            domain={[2025.5, 2035.5]}
            ticks={[2026, 2035]}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            stroke="var(--navy-light)"
            tickFormatter={formatAxisValue}
            label={{ value: primaryLabel, angle: -90, position: 'insideLeft', offset: 5, fontSize: 11 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            stroke="var(--gold)"
            label={{ value: 'Margin %', angle: 90, position: 'insideRight', offset: 5, fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: `1px solid var(--border)`,
              borderRadius: '4px',
              padding: '8px',
              fontSize: '12px',
            }}
            formatter={(value, name) => {
              if (name === primaryKey) return [value, primaryLabel];
              if (name === 'margin') return [`${value}%`, 'Operating Margin'];
              return value;
            }}
          />
          <Legend content={CustomLegend} wrapperStyle={{ fontSize: '12px' }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey={primaryKey}
            name={primaryLabel}
            stroke="var(--navy)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="margin"
            name={marginLabel}
            stroke="var(--gold)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
