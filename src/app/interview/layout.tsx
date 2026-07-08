import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Interview | NCT Navigator",
};

export default function InterviewLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
