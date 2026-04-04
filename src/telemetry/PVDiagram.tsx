import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useEngineStore } from '../store/engineStore';

export function PVDiagram() {
  const pvHistory = useEngineStore((s) => s.pvHistory);
  const config = useEngineStore((s) => s.engineConfig);

  const Vd = (Math.PI * config.bore ** 2 * config.stroke) / 4 * 1e6; // cm³
  const Vc = Vd / (config.compressionRatio - 1); // clearance volume

  return (
    <div className="chart-container">
      <h3 className="chart-title">P–V Diagram</h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={pvHistory} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
          <XAxis
            dataKey="volume"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => v.toFixed(1)}
            label={{ value: 'Vol (cm³)', position: 'insideBottom', offset: -2, fill: '#8899aa', fontSize: 10 }}
            tick={{ fill: '#8899aa', fontSize: 10 }}
          />
          <YAxis
            dataKey="pressure"
            domain={[0, 'auto']}
            tickFormatter={(v: number) => v.toFixed(0)}
            label={{ value: 'bar', angle: -90, position: 'insideLeft', fill: '#8899aa', fontSize: 10 }}
            tick={{ fill: '#8899aa', fontSize: 10 }}
          />
          <ReferenceLine
            x={Vc}
            stroke="#ff4444"
            strokeDasharray="4 2"
            label={{ value: 'TDC', fill: '#ff4444', fontSize: 9 }}
          />
          <Line
            type="monotone"
            dataKey="pressure"
            dot={false}
            stroke="#00e5aa"
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Tooltip
            contentStyle={{ background: '#0f1724', border: '1px solid #334', fontSize: 11 }}
            labelFormatter={(v: number) => `${v.toFixed(2)} cm³`}
            formatter={(v: number) => [`${v.toFixed(1)} bar`, 'Pressure']}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
