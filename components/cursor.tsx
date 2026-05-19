import { cn } from "@/lib/utils";

/** Remote participant — avatar + name (Linear card styling). */
export const Cursor = ({
  className,
  style,
  color,
  name,
  avatar,
}: {
  className?: string;
  style?: React.CSSProperties;
  color: string;
  name: string;
  avatar: string;
}) => {
  return (
    <div
      className={cn("pointer-events-none select-none", className)}
      style={style}
    >
      <div className="flex flex-col items-start gap-1 pl-3 pt-3">
        <div
          className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-lg ring-1 ring-border"
          style={{ borderColor: color, boxShadow: `0 0 0 1px ${color}40` }}
        >
          {avatar}
        </div>
        <span
          className="max-w-[120px] truncate rounded-md px-2 py-0.5 text-[11px] font-medium text-primary-foreground"
          style={{ backgroundColor: color }}
        >
          {name}
        </span>
      </div>
    </div>
  );
};
