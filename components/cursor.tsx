import { cn } from "@/lib/utils";

/** Participant cursor — emoji avatar, optional name label. */
export const Cursor = ({
  className,
  style,
  color,
  name,
  avatar,
  isSelf = false,
}: {
  className?: string;
  style?: React.CSSProperties;
  color: string;
  name: string;
  avatar: string;
  isSelf?: boolean;
}) => {
  return (
    <div
      className={cn("pointer-events-none select-none", className)}
      style={style}
    >
      <div
        className={cn(
          "flex flex-col items-start",
          isSelf ? "gap-0.5 pl-2 pt-2" : "gap-1 pl-3 pt-3"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full border border-border bg-card ring-1 ring-border",
            isSelf ? "size-8 text-base" : "size-9 text-lg"
          )}
          style={{ borderColor: color, boxShadow: `0 0 0 1px ${color}40` }}
          aria-hidden
        >
          {avatar}
        </div>
        {!isSelf && (
          <span
            className="max-w-[120px] truncate rounded-md px-2 py-0.5 text-[11px] font-medium text-primary-foreground"
            style={{ backgroundColor: color }}
          >
            {name}
          </span>
        )}
      </div>
    </div>
  );
};
