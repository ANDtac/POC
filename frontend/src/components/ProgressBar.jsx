export default function ProgressBar({ value, max, label, size = "normal" }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div
      className={`progress progress--${size}${max && value >= max ? " progress--done" : ""}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max}`}
    >
      <div className="progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
