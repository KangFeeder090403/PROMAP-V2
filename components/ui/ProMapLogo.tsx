export function ProMapLogo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-blue-800 shadow-sm ${className}`}
      aria-hidden="true"
    >
      {/* Layered Arrow: 2 lapisan balok + panah maju/eksekusi */}
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
        {/* Layer bawah */}
        <path
          d="M4 16.5L12 21L20 16.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.45"
        />
        {/* Layer tengah */}
        <path
          d="M4 12L12 16.5L20 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
        {/* Layer atas dengan panah puncak */}
        <path
          d="M12 3L4 7.5L12 12L20 7.5L12 3Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
