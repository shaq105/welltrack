import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export type DataPoint = Record<string, string | number | null>;

export interface SeriesConfig {
  key: string;
  label: string;
  color: string;
}

interface Props {
  data: DataPoint[];
  series: SeriesConfig[];
  yDomain?: [number, number];
  yTicks?: number[];
  height?: number;
}

export default function TrendLineChart({
  data,
  series,
  yDomain,
  yTicks,
  height = 260,
}: Props) {
  // Auto-select x-axis interval to avoid label overcrowding
  const xInterval = data.length <= 7 ? 0 : data.length <= 30 ? 4 : 12;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#c2d9c3" strokeOpacity={0.6} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#3a633d' }}
          interval={xInterval}
          tickLine={false}
          axisLine={{ stroke: '#c2d9c3' }}
        />
        <YAxis
          domain={yDomain}
          ticks={yTicks}
          tick={{ fontSize: 11, fill: '#3a633d' }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #c2d9c3',
            borderRadius: '8px',
            fontSize: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
          itemStyle={{ color: '#2f5032' }}
          labelStyle={{ color: '#115e59', fontWeight: 600, marginBottom: 4 }}
        />
        {series.length > 1 && (
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: '#3a633d' }} />
        )}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
