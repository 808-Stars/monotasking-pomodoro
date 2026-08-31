const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  TODO:          { bg: '#f4e8d4', color: 'var(--oto-text-dim)', border: '#c8a040' },
  IN_PROGRESS:   { bg: '#d8dce8', color: '#304868', border: '#687898' },
  DONE:          { bg: '#d8e8d8', color: '#305830', border: '#689050' },
  ARCHIVED:      { bg: '#e8e0d4', color: '#807060', border: '#a89880' },
  HIGH:          { bg: '#f0d8d8', color: '#8a3030', border: '#a05858' },
  MEDIUM:        { bg: '#f0e8d0', color: '#8a6820', border: '#b89050' },
  LOW:           { bg: '#e0e8d8', color: '#406838', border: '#689868' },
  ACTIVE:        { bg: '#d8dce8', color: '#304868', border: '#687898' },
  COMPLETED:     { bg: '#e0ece0', color: '#305830', border: '#689050' },
  INTERRUPTED:   { bg: '#f0e0d0', color: '#a06030', border: '#b88050' },
  CANCELLED:     { bg: '#e8e0d4', color: '#807060', border: '#a89880' },
  UNPLANNED:     { bg: '#e8e8e8', color: '#333', border: '#222' },
  PLANNED:       { bg: '#e8e4f0', color: '#4a4060', border: '#687898' },
  FAILED:        { bg: '#f0e0e0', color: '#6a2028', border: '#a03038' },
  REVIEWED:      { bg: '#ece4f0', color: '#504060', border: '#786890' },
  WORK:          { bg: '#f0d8d8', color: '#8a3030', border: '#a05858' },
  SHORT_BREAK:   { bg: '#d8e8d8', color: '#406838', border: '#689868' },
  LONG_BREAK:    { bg: '#d8dce8', color: '#304868', border: '#687898' },
  DAILY:         { bg: '#d8dce8', color: '#304868', border: '#687898' },
  WEEKLY:        { bg: '#f0e8d0', color: '#8a6820', border: '#b89050' },
  MONTHLY:       { bg: '#e4dce8', color: '#504868', border: '#786890' },
};

interface StatusBadgeProps { label: string; status: string; className?: string; }

export default function StatusBadge({ label, status, className = '' }: StatusBadgeProps) {
  const c = STATUS_COLORS[status] || { bg: '#f4e8d4', color: 'var(--oto-text-dim)', border: '#c8a040' };
  return (
    <span
      className={`inline-block px-2 py-0.5 font-semibold ${className}`}
      style={{
        fontFamily: 'var(--oto-font-body)',
        fontSize: '11px', letterSpacing: '0.04em',
        background: c.bg, color: c.color,
        border: `1px solid ${c.border}`,
      }}
    >
      {label}
    </span>
  );
}
