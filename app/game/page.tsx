import type { Metadata } from "next";
import Terminal from "./terminal";

export const metadata: Metadata = {
  title: "Terminal | JuiYuHung",
};

export default function Game() {
  return (
    <section className="pt-24 pb-12 px-4 mx-auto max-w-5xl relative z-10">
      <div className="animate-fade-in">
        <h2 className="text-xl md:text-left text-center font-bold tracking-wide">TERMINAL</h2>
        <hr className="border-terminal_green my-2 border-2" />
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-2 pb-3">
          <h3 className="font-bold text-terminal_green text-lg">Résumé Shell</h3>
          <span className="font-mono text-xs md:text-sm opacity-70">
            explore my résumé from the command line
          </span>
        </div>
        <Terminal />
      </div>
    </section>
  );
}
