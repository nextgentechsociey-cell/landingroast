"use client"

type Props = {
  value: string
  onChange: (url: string) => void
  onSubmit: () => void
  variant?: "light" | "dark"
  disabled?: boolean
}

export default function UrlInput({
  value,
  onChange,
  onSubmit,
  variant = "light",
  disabled,
}: Props) {
  const isDark = variant === "dark"

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
      <input
        type="url"
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="https://yourlandingpage.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !disabled && onSubmit()}
        disabled={disabled}
        className={[
          "h-12 min-w-0 flex-1 rounded-xl px-4 text-base focus:outline-none focus:ring-1 disabled:opacity-50",
          isDark
            ? "border border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:ring-slate-600"
            : "border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-300 shadow-sm",
        ].join(" ")}
      />
      <button
        onClick={onSubmit}
        disabled={disabled}
        className={[
          "h-12 rounded-xl px-6 text-sm font-semibold transition disabled:opacity-50 shrink-0",
          isDark
            ? "bg-white text-slate-950 hover:bg-slate-100 active:bg-slate-200"
            : "bg-slate-900 text-white hover:bg-slate-700 active:bg-slate-800",
        ].join(" ")}
      >
        Analyze →
      </button>
    </div>
  )
}
