import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 | Arcade Vault",
};

export default function NotFound() {
  return (
    <div className="fade-in flex flex-col items-center px-6 py-24 text-center">
      <div className="pixel neon-magenta flicker text-[64px] max-sm:text-[40px]">
        404
      </div>
      <div className="pixel neon-cyan mt-6 text-[14px]">GAME OVER</div>
      <p className="mt-4 max-w-md text-[var(--ink-dim)]">
        Esta página no existe en el vault. Inserta una moneda y vuelve a
        intentarlo.
      </p>
      <div className="pixel mt-6 text-[10px] tracking-[0.2em] text-[var(--yellow)]">
        CONTINUAR? <span className="blink">_</span>
      </div>
      <Link href="/games" className="btn xl pulse mt-10">
        VOLVER AL VAULT
      </Link>
    </div>
  );
}
