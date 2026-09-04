export function BarChart({
  data,
  barColor = '#3B82F6',
  colorByLabel,
  maxValue,
  valueSuffix = '',
}: {
  data: { label: string; value: number }[]
  barColor?: string
  colorByLabel?: Record<string, string>
  maxValue?: number
  valueSuffix?: string
}) {
  const allZero = data.every((d) => d.value === 0)
  if (data.length === 0 || allZero) {
    return <p className="text-sm text-slate-400">Belum ada data</p>
  }

  const max = maxValue ?? (Math.max(...data.map((d) => d.value)) || 100)

  return (
    <div role="img" aria-label={`Grafik batang ${data.length} item`} className="space-y-3">
      {data.map((d) => (
        <div key={d.label} role="img" aria-label={`${d.label}: ${d.value}${valueSuffix}`}>
          <div className="flex justify-between text-sm">
            <span className="text-slate-700">{d.label}</span>
            <span className="text-slate-500 font-medium">{d.value}{valueSuffix}</span>
          </div>
          <div className="bg-slate-200 rounded-full h-2 mt-1">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: colorByLabel?.[d.label] ?? barColor }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
