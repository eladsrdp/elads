import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ForecastResult } from '../types'
import { formatCurrency } from '../lib/currency'

interface Props {
  result: ForecastResult
  creditLimit: number
}

/** תזרים ליניארי: גרף שטח של היתרה החזויה מהיום עד יום היעד. */
export function FlowChart({ result, creditLimit }: Props) {
  const danger = result.status === 'danger'
  const color = danger ? '#fb7185' : '#34d399'
  const data = result.points.map((p) => ({
    day: Number(p.date.slice(8, 10)),
    balance: p.balance,
  }))

  return (
    <div className="rounded-3xl bg-slate-800/40 p-4 ring-1 ring-slate-700/50">
      <div className="mb-2 px-2 text-sm font-medium text-slate-400">
        תזרים יומי עד יום היעד
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 12,
              direction: 'rtl',
            }}
            labelFormatter={(d) => `${d} בחודש`}
            formatter={(v) => [formatCurrency(Number(v)), 'יתרה']}
          />
          <ReferenceLine y={-creditLimit} stroke="#f43f5e" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={color}
            strokeWidth={2}
            fill="url(#flowFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
