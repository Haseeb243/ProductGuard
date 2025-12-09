const baseGlassStyles =
  "rounded-3xl border border-white/10 backdrop-blur-2xl shadow-[0_40px_90px_-60px_rgba(8,15,35,0.9)]";

export const glassCardClass = `${baseGlassStyles} bg-slate-900/65`; // standard card container
export const glassPanelClass = `${baseGlassStyles} bg-slate-900/55`; // lighter padding wrapper
export const gradientBorderClass =
  "relative rounded-3xl bg-gradient-to-br from-sky-500/40 via-indigo-500/20 to-purple-500/30 p-[1px]";

export const glassButtonClass =
  "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10";

export const glassSelectClass =
  "glass-select appearance-none border border-white/15 bg-gradient-to-r from-[#121736]/90 via-[#171f3d]/85 to-[#1a2149]/80 text-[0.95rem] font-medium text-white/90 shadow-[0_25px_60px_-45px_rgba(15,12,60,0.9)] focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition";

export const glassInputClass =
  "glass-input border border-white/15 bg-gradient-to-r from-[#10142d]/92 via-[#141a38]/88 to-[#141a38]/82 text-white/90 placeholder-white/45 shadow-[0_25px_60px_-55px_rgba(10,12,48,0.95)] focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition";

export const badgePillClass =
  "inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/80";

export const sectionTitleClass =
  "text-lg font-semibold tracking-tight text-white flex items-center gap-2";

export const sectionSubtitleClass = "text-sm text-white/60";

export const metricValueClass = "text-3xl font-bold tracking-tight text-white";
export const metricDeltaPositiveClass =
  "inline-flex items-center gap-1 text-emerald-400 text-sm font-medium";
export const metricDeltaNegativeClass =
  "inline-flex items-center gap-1 text-rose-400 text-sm font-medium";

export const GlassCard = ({
  className = "",
  children,
  padding = "p-6",
  tone = "standard",
}) => {
  const surfaceClass = tone === "highlight" ? glassPanelClass : glassCardClass;
  return (
    <div className={`${surfaceClass} ${padding} ${className}`}>{children}</div>
  );
};

export const GradientBorderCard = ({
  className = "",
  children,
  padding = "p-6",
}) => (
  <div className={`${gradientBorderClass} ${className}`}>
    <div className={`${glassPanelClass} ${padding}`}>{children}</div>
  </div>
);

export const MetaPill = ({ icon = null, label, value }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.4em] text-white/70">
    {icon}
    <span className="font-semibold text-white/60">{label}</span>
    <span className="text-white whitespace-nowrap">{value}</span>
  </div>
);

export const Divider = ({ className = "" }) => (
  <div className={`h-px w-full bg-white/5 ${className}`} />
);

export const SectionHeader = ({
  eyebrow = null,
  title,
  subtitle = null,
  description = null,
  actions = null,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div className="space-y-1">
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-white/50">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-xl font-semibold text-white tracking-tight">
        {title}
      </h2>
      {subtitle || description ? (
        <p className="text-sm text-white/60">{description || subtitle}</p>
      ) : null}
    </div>
    {actions}
  </div>
);
