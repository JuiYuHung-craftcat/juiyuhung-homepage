"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const START_PRICE = 100;
const START_CASH = 10000;
const LOT = 10;
const MAX_POSITION = 50;
const TOTAL_TICKS = 120;
const TICK_MS = 150;
const BEST_KEY = "trading-game-best";

type Trade = { tick: number; price: number; side: "B" | "S" };
type Status = "idle" | "running" | "over";

// Random walk with volatility clustering and rare jumps.
const nextPrice = (price: number, vol: number) => {
  const shock = (Math.random() - 0.5) * 2 * vol;
  const jump = Math.random() < 0.03 ? (Math.random() - 0.5) * 8 : 0;
  return Math.max(1, price * (1 + (shock + jump) / 100));
};

const readBest = () => {
  try {
    const v = localStorage.getItem(BEST_KEY);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
};

const writeBest = (v: number) => {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {}
};

const fmt = (v: number) =>
  `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const Chart = ({ prices, trades }: { prices: number[]; trades: Trade[] }) => {
  const w = 600;
  const h = 200;
  const min = Math.min(...prices) * 0.995;
  const max = Math.max(...prices) * 1.005;
  const x = (i: number) => (i / (TOTAL_TICKS - 1)) * w;
  const y = (p: number) => h - ((p - min) / (max - min || 1)) * h;
  const points = prices.map((p, i) => `${x(i)},${y(p)}`).join(" ");
  const last = prices[prices.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-48 md:h-56 border border-terminal_green/40 rounded"
      preserveAspectRatio="none"
    >
      <line
        x1="0"
        x2={w}
        y1={y(START_PRICE)}
        y2={y(START_PRICE)}
        stroke="#00BB00"
        strokeOpacity="0.25"
        strokeDasharray="4 4"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={points}
        fill="none"
        stroke="#00BB00"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {trades.map((t, i) => (
        <circle
          key={i}
          cx={x(t.tick)}
          cy={y(t.price)}
          r="5"
          fill={t.side === "B" ? "#00BB00" : "#ff4d4d"}
          stroke="black"
        />
      ))}
      <circle cx={x(prices.length - 1)} cy={y(last)} r="4" fill="#00BB00">
        <animate
          attributeName="r"
          values="3;6;3"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
};

const TradingGame = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [prices, setPrices] = useState<number[]>([START_PRICE]);
  const [cash, setCash] = useState(START_CASH);
  const [position, setPosition] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [best, setBest] = useState<number | null>(null);
  const volRef = useRef(0.6);

  const price = prices[prices.length - 1];
  const equity = cash + position * price;
  const pnl = equity - START_CASH;
  const tick = prices.length - 1;

  useEffect(() => {
    setBest(readBest());
  }, []);

  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      setPrices((ps) => {
        if (ps.length >= TOTAL_TICKS) return ps;
        volRef.current = Math.min(
          2,
          Math.max(0.3, volRef.current + (Math.random() - 0.5) * 0.2),
        );
        return [...ps, nextPrice(ps[ps.length - 1], volRef.current)];
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [status]);

  // End of session: flatten the position at the last price.
  useEffect(() => {
    if (status !== "running" || prices.length < TOTAL_TICKS) return;
    const finalEquity = cash + position * price;
    const finalPnl = finalEquity - START_CASH;
    setCash(finalEquity);
    setPosition(0);
    setStatus("over");
    if (best === null || finalPnl > best) {
      setBest(finalPnl);
      writeBest(finalPnl);
    }
  }, [status, prices.length, cash, position, price, best]);

  const start = () => {
    volRef.current = 0.6;
    setPrices([START_PRICE]);
    setCash(START_CASH);
    setPosition(0);
    setTrades([]);
    setStatus("running");
  };

  const trade = useCallback(
    (side: "B" | "S") => {
      if (status !== "running") return;
      const dir = side === "B" ? 1 : -1;
      const next = position + dir * LOT;
      if (Math.abs(next) > MAX_POSITION) return;
      setPosition(next);
      setCash((c) => c - dir * LOT * price);
      setTrades((ts) => [...ts, { tick, price, side }]);
    },
    [status, position, price, tick],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (status !== "running") return;
      const k = e.key.toLowerCase();
      if (k === "b") trade("B");
      if (k === "s") trade("S");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, trade]);

  const change = ((price - START_PRICE) / START_PRICE) * 100;

  return (
    <div className="hover:bg-terminal_green/5 p-4 rounded-lg transition-all duration-300 border-l-4 border-transparent hover:border-terminal_green">
      <p className="md:text-base text-sm pb-4">
        Beat the market in {(TOTAL_TICKS * TICK_MS) / 1000} seconds. Buy or
        sell {LOT} shares at a time (keys{" "}
        <span className="text-terminal_green font-bold">B</span> /{" "}
        <span className="text-terminal_green font-bold">S</span>), position
        limit ±{MAX_POSITION}. Your position is closed out when the session
        ends.
      </p>

      <div className="flex flex-wrap justify-between items-end gap-2 pb-2 font-mono">
        <div>
          <span className="text-2xl font-bold text-terminal_green">
            {price.toFixed(2)}
          </span>
          <span
            className={`pl-2 text-sm ${change >= 0 ? "text-terminal_green" : "text-red-500"}`}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </span>
        </div>
        <div className="text-sm">
          Tick {tick}/{TOTAL_TICKS - 1}
        </div>
      </div>

      <div className="relative">
        <Chart prices={prices} trades={trades} />
        {status !== "running" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded gap-2">
            {status === "over" && (
              <p className="text-lg font-bold">
                Final P&L:{" "}
                <span
                  className={pnl >= 0 ? "text-terminal_green" : "text-red-500"}
                >
                  {fmt(pnl)}
                </span>
              </p>
            )}
            <button
              type="button"
              onClick={start}
              className="px-4 py-2 rounded bg-terminal_green text-black font-bold hover:scale-105 transition-transform duration-200"
            >
              {status === "idle" ? "START TRADING" : "PLAY AGAIN"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 font-mono md:text-sm text-xs">
        <div>
          Cash
          <br />
          <span className="text-terminal_green">{fmt(cash)}</span>
        </div>
        <div>
          Position
          <br />
          <span className="text-terminal_green">{position}</span>
        </div>
        <div>
          P&L
          <br />
          <span className={pnl >= 0 ? "text-terminal_green" : "text-red-500"}>
            {fmt(pnl)}
          </span>
        </div>
        <div>
          Best
          <br />
          <span className="text-terminal_green">
            {best === null ? "—" : fmt(best)}
          </span>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={() => trade("B")}
          disabled={status !== "running" || position + LOT > MAX_POSITION}
          className="flex-1 py-2 rounded border-2 border-terminal_green text-terminal_green font-bold hover:bg-terminal_green hover:text-black transition-colors duration-200 disabled:opacity-30 disabled:pointer-events-none"
        >
          BUY {LOT}
        </button>
        <button
          type="button"
          onClick={() => trade("S")}
          disabled={status !== "running" || position - LOT < -MAX_POSITION}
          className="flex-1 py-2 rounded border-2 border-red-500 text-red-500 font-bold hover:bg-red-500 hover:text-black transition-colors duration-200 disabled:opacity-30 disabled:pointer-events-none"
        >
          SELL {LOT}
        </button>
      </div>
    </div>
  );
};

export default TradingGame;
