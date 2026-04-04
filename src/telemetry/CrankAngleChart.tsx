import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useEngineStore } from '../store/engineStore';

export function CrankAngleChart() {
  const paHistory = useEngineStore((s) => s.paHistory);
  const config = useEngineStore((s) => s.engineConfig);
  const ignitionAngle = 360 - config.ignitionAdvance;

  return (
    <div className="chart-container">
      <h3 className="chart-title">Pressure vs Crank Angle</h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={paHistory} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          {/* Phase region backgrounds */}
          <ReferenceArea x1={0} x2={180} fill="#112233" fillOpacity={0.5} label={{ value: 'INTAKE', fill: '#4488bb', fontSize: 9, position: 'insideTop' }} />
          <ReferenceArea x1={180} x2={360} fill="#221122" fillOpacity={0.5} label={{ value: 'COMP', fill: '#bb44aa', fontSize: 9, position: 'insideTop' }} />
          <ReferenceArea x1={360} x2={540} fill="#221100" fillOpacity={0.5} label={{ value: 'POWER', fill: '#ff6633', fontSize: 9, position: 'insideTop' }} />
          <ReferenceArea x1={540} x2={720} fill="#112211" fillOpacity={0.5} label={{ value: 'EXHAUST', fill: '#44aa55', fontSize: 9, position: 'insideTop' }} />

          <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
          <XAxis
            dataKey="angle"
            type="number"
            domain={[0, 720]}
            ticks={[0, 180, 360, 540, 720]}
            tick={{ fill: '#8899aa', fontSize: 10 }}
            label={{ value: 'Crank Angle (°)', position: 'insideBottom', offset: -2, fill: '#8899aa', fontSize: 10 }}
          />
          <YAxis
            domain={[0, 'auto']}
            tickFormatter={(v: number) => v.toFixed(0)}
            label={{ value: 'bar', angle: -90, position: 'insideLeft', fill: '#8899aa', fontSize: 10 }}
            tick={{ fill: '#8899aa', fontSize: 10 }}
          />
          <ReferenceLine
            x={ignitionAngle}
            stroke="#ffdd00"
            strokeDasharray="4 2"
            label={{ value: 'IGN', fill: '#ffdd00', fontSize: 9 }}
          />
          <Line
            type="monotone"
            dataKey="pressure"
            dot={false}
            stroke="#ff7733"
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Tooltip
            contentStyle={{ background: '#0f1724', border: '1px solid #334', fontSize: 11 }}
            labelFormatter={(v: number) => `${v.toFixed(0)}° crank`}
            formatter={(v: number) => [`${v.toFixed(1)} bar`, 'Pressure']}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
