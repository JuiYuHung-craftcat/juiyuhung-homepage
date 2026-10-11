import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game | JuiYuHung",
};

const GAME_SRC = "/games/midnight-coast.html";

export default function Game() {
  return (
    <section className="pt-24 pb-12 px-4 mx-auto max-w-5xl relative z-10">
      <div className="animate-fade-in">
        <h2 className="text-xl md:text-left text-center font-bold tracking-wide">GAME</h2>
        <hr className="border-terminal_green my-2 border-2" />
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-2 pb-3">
          <h3 className="font-bold text-terminal_green text-lg">Midnight Coast</h3>
          <a
            href={GAME_SRC}
            target="_blank"
            className="font-mono text-xs md:text-sm opacity-70 hover:opacity-100 hover:underline decoration-2"
          >
            $ open --fullscreen ↗
          </a>
        </div>
        <iframe
          src={GAME_SRC}
          title="Midnight Coast racing game"
          allow="fullscreen; autoplay"
          className="w-full aspect-[4/5] sm:aspect-[16/10] max-h-[80vh] rounded-lg border-2 border-terminal_green/40 bg-black"
        />
        <p className="pt-3 md:text-sm text-xs opacity-70">
          Arrow keys or WASD to drive, Space for nitro, P to pause. On a phone, open it full screen
          and turn sideways.
        </p>
      </div>
    </section>
  );
}
