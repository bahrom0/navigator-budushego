"use client";

function shimmer() {
  return (
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[20px] border border-border bg-card-bg p-6 ${className}`}>
      {shimmer()}
      <div className="space-y-3">
        <div className="h-4 w-3/4 rounded bg-border" />
        <div className="h-3 w-1/2 rounded bg-border" />
        <div className="h-20 w-full rounded-xl bg-border" />
        <div className="h-9 w-24 rounded-[14px] bg-border" />
      </div>
    </div>
  );
}

export function TextSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden h-3 rounded bg-border"
          style={{ width: i === lines - 1 ? "65%" : "100%" }}
        >
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      ))}
    </div>
  );
}

export function ResultSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-[20px] border border-border bg-card-bg p-5"
        >
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-5 w-32 rounded bg-border" />
              <div className="h-3 w-48 rounded bg-border" />
              <div className="h-3 w-3/4 rounded bg-border" />
            </div>
            <div className="h-8 w-16 rounded-full bg-border" />
          </div>
        </div>
      ))}
    </div>
  );
}