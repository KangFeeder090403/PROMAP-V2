export function MetricCard({
  label,
  value,
  variant = 'default',
}: {
  label: string
  value: number | string
  variant?: 'default' | 'danger'
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${variant === 'danger' ? 'text-red-500' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  )
}
