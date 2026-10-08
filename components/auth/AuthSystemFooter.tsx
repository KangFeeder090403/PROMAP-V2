export function AuthSystemFooter() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white px-4 py-2 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        &copy; {new Date().getFullYear()} ProMaP
      </p>
    </footer>
  )
}
