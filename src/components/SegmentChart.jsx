import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SegmentChart({ launches, margin }) {
  const years = Array.from({ length: 11 }, (_, i) => 2025 + i);
  const data = years.map((year, i) => ({
    year,
    launches: Math.round(launches[i]),
    margin: Math.round(margin[i] * 10000) / 100,
  }));

  return (
    <div className="segment-chart">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11 }}
            stroke="var(--navy-light)"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            stroke="var(--navy-light)"
            label={{ value: 'Launches', angle: -90, position: 'insideLeft', offset: 5, fontSize: 11 }}
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
              if (name === 'launches') return [value, 'Annual Launches'];
              if (name === 'margin') return [`${value}%`, 'Operating Margin'];
              return value;
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="launches"
            stroke="var(--navy)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="margin"
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
