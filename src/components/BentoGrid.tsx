"use client";

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4;
}

export function BentoGrid({ children, className = "", cols = 3 }: BentoGridProps) {
  const colMap = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
    6: "grid-cols-1 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
  };

  return (
    <div
      className={`
        grid gap-6
        ${colMap[cols]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}