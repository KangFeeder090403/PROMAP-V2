export function StatusBadge({
  status,
  styleMap,
  labelMap,
  className = '',
}: {
  status: string
  styleMap: Record<string, string>
  labelMap?: Record<string, string>
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styleMap[status] ?? 'bg-slate-100 text-slate-600'
      } ${className}`}
    >
      {labelMap?.[status] ?? status}
    </span>
  )
}
