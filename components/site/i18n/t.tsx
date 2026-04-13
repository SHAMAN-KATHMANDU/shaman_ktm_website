import type { ReactNode } from "react";

export function T({ en, np }: { en: ReactNode; np: ReactNode }) {
  return (
    <>
      <span className="sk-t-en">{en}</span>
      <span className="sk-t-np sk-np-text">{np}</span>
    </>
  );
}
