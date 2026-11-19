import type { ReactNode } from "react";

export default function AuthCard({ children }: { children: ReactNode }) {
  return (
  <main className="mn-login"><section className="mn-login-sheet">
      <div className="mn-login-heading"><span>LOXADA</span><b>INK.</b></div>
      {children}
    </section>
  </main>
  );
}
