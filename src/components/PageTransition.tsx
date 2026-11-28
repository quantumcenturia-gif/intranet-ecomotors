"use client";

import { usePathname } from "next/navigation";

/** Cada página entra con un pequeño desvanecido al navegar. */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
