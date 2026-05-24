"use client";

import { Button } from "@/components/ui/button";
import { touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  count: number;
  onReview: () => void;
  className?: string;
};

export function HostPendingBanner({ count, onReview, className }: Props) {
  if (count <= 0) return null;

  return (
    <div
      className={cn(
        "border-b border-amber-500/30 bg-amber-500/10",
        className
      )}
      role="status"
    >
      <div className="flex flex-col gap-3 px-safe py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-foreground">
          <span className="font-medium">
            {count} {count === 1 ? "person" : "people"} waiting
          </span>
          <span className="text-muted-foreground"> to join this session.</span>
        </p>
        <Button
          type="button"
          size="sm"
          className={cn(touchTarget, "h-11 w-full shrink-0 sm:w-auto")}
          onClick={onReview}
        >
          Review
        </Button>
      </div>
    </div>
  );
}
