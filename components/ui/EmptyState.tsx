export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border px-4 py-10 text-center">
      {Icon ? <Icon className="size-8 text-muted/60" /> : null}
      <p className="text-sm font-medium text-text">{title}</p>
      {hint ? <p className="max-w-xs text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
