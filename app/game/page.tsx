import type { Metadata } from "next";
import TradingGame from "../(main)/trading-game";

export const metadata: Metadata = {
  title: "Game | JuiYuHung",
};

export default function Game() {
  return (
    <section className="pt-24 pb-12 px-4 mx-auto max-w-3xl relative z-10">
      <div className="animate-fade-in">
        <h2 className="text-xl md:text-left text-center font-bold tracking-wide">GAME</h2>
        <hr className="border-terminal_green my-2 border-2" />
        <h3 className="font-bold text-terminal_green text-lg pt-2">Trading Game</h3>
        <TradingGame />
      </div>
    </section>
  );
}
