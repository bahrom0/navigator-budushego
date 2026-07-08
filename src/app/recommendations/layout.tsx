import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Recommendations | NCT Navigator",
};

export default function RecommendationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
