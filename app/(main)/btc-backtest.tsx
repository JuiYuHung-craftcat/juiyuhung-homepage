"use client";
import { useEffect, useMemo, useState } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;
const VISIBLE_DAYS = 183;
const WARMUP_DAYS = 60;
const FEE = 0.001;
const START_EQUITY = 10000;
const LIVE_URL = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${
  VISIBLE_DAYS + WARMUP_DAYS + 1
}`;
const SNAPSHOT_URL = "/data/btc-1d.json";

const UP = "#00BB00";
const DOWN = "#ff4d4d";

type Candle = { t: number; o: number; h: number; l: number; c: number };
type Series = (number | null)[];
type Overlay = { label: string; values: Series; color: string; dashed?: boolean };
type Param = { key: string; label: string; min: number; max: number; step: number; def: number };
type Strategy = {
  id: string;
  name: string;
  desc: string;
  params: Param[];
  run: (cs: Candle[], p: Record<string, number>) => { signal: number[]; overlays: Overlay[] };
};
type Trade = { i: number; side: "B" | "S"; price: number };

// ---------- indicators ----------

const sma = (xs: number[], n: number): Series =>
  xs.map((_, i) => {
    if (i < n - 1) return null;
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += xs[j];
    return s / n;
  });

const stdev = (xs: number[], n: number, mean: Series): Series =>
  xs.map((_, i) => {
    const m = mean[i];
    if (m === null) return null;
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += (xs[j] - m) ** 2;
    return Math.sqrt(s / n);
  });

// Wilder's RSI.
const rsi = (xs: number[], n: number): Series => {
  const out: Series = xs.map(() => null);
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < xs.length; i++) {
    const d = xs[i] - xs[i - 1];
    const g = Math.max(d, 0);
    const l = Math.max(-d, 0);
    if (i <= n) {
      gain += g / n;
      loss += l / n;
    } else {
      gain = (gain * (n - 1) + g) / n;
      loss = (loss * (n - 1) + l) / n;
    }
    if (i >= n) out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
};

// Highest high / lowest low of the previous n bars (excluding the current one).
const priorExtreme = (xs: number[], n: number, pick: (...v: number[]) => number): Series =>
  xs.map((_, i) => (i < n ? null : pick(...xs.slice(i - n, i))));

// ---------- strategies (long-only, signal[i] = desired position after bar i closes) ----------

const STRATEGIES: Strategy[] = [
  {
    id: "hold",
    name: "Buy & Hold",
    desc: "Buy on the first day and never sell. The benchmark every strategy has to beat.",
    params: [],
    run: (cs) => ({ signal: cs.map(() => 1), overlays: [] }),
  },
  {
    id: "sma",
    name: "SMA Crossover",
    desc: "Trend following. Long while the fast moving average is above the slow one, flat otherwise.",
    params: [
      { key: "fast", label: "Fast SMA", min: 3, max: 30, step: 1, def: 10 },
      { key: "slow", label: "Slow SMA", min: 10, max: 60, step: 1, def: 30 },
    ],
    run: (cs, p) => {
      const close = cs.map((c) => c.c);
      const f = sma(close, p.fast);
      const s = sma(close, p.slow);
      return {
        signal: cs.map((_, i) => (f[i] !== null && s[i] !== null && f[i]! > s[i]! ? 1 : 0)),
        overlays: [
          { label: `SMA ${p.fast}`, values: f, color: "#facc15" },
          { label: `SMA ${p.slow}`, values: s, color: "#38bdf8" },
        ],
      };
    },
  },
  {
    id: "rsi",
    name: "RSI Mean Reversion",
    desc: "Buy when RSI drops below the oversold level, sell when it rises above the overbought level.",
    params: [
      { key: "period", label: "RSI period", min: 5, max: 30, step: 1, def: 14 },
      { key: "low", label: "Oversold", min: 10, max: 45, step: 1, def: 30 },
      { key: "high", label: "Overbought", min: 50, max: 90, step: 1, def: 70 },
    ],
    run: (cs, p) => {
      const r = rsi(
        cs.map((c) => c.c),
        p.period,
      );
      let pos = 0;
      const signal = r.map((v) => {
        if (v !== null && v < p.low) pos = 1;
        else if (v !== null && v > p.high) pos = 0;
        return pos;
      });
      return { signal, overlays: [] };
    },
  },
  {
    id: "boll",
    name: "Bollinger Reversion",
    desc: "Buy when price closes below the lower band, take profit when it closes back above the middle band.",
    params: [
      { key: "period", label: "Period", min: 10, max: 40, step: 1, def: 20 },
      { key: "k", label: "Band width (σ)", min: 1, max: 3, step: 0.1, def: 2 },
    ],
    run: (cs, p) => {
      const close = cs.map((c) => c.c);
      const mid = sma(close, p.period);
      const sd = stdev(close, p.period, mid);
      const upper = mid.map((m, i) => (m === null ? null : m + p.k * sd[i]!));
      const lower = mid.map((m, i) => (m === null ? null : m - p.k * sd[i]!));
      let pos = 0;
      const signal = close.map((c, i) => {
        if (lower[i] !== null && c < lower[i]!) pos = 1;
        else if (mid[i] !== null && c > mid[i]!) pos = 0;
        return pos;
      });
      return {
        signal,
        overlays: [
          { label: "Upper", values: upper, color: "#a78bfa", dashed: true },
          { label: "Middle", values: mid, color: "#a78bfa" },
          { label: "Lower", values: lower, color: "#a78bfa", dashed: true },
        ],
      };
    },
  },
  {
    id: "donchian",
    name: "Donchian Breakout",
    desc: "Turtle-style breakout. Buy on a new N-day high, exit on a new M-day low.",
    params: [
      { key: "entry", label: "Entry high (days)", min: 5, max: 55, step: 1, def: 20 },
      { key: "exit", label: "Exit low (days)", min: 3, max: 30, step: 1, def: 10 },
    ],
    run: (cs, p) => {
      const hi = priorExtreme(
        cs.map((c) => c.h),
        p.entry,
        Math.max,
      );
      const lo = priorExtreme(
        cs.map((c) => c.l),
        p.exit,
        Math.min,
      );
      let pos = 0;
      const signal = cs.map((c, i) => {
        if (hi[i] !== null && c.c > hi[i]!) pos = 1;
        else if (lo[i] !== null && c.c < lo[i]!) pos = 0;
        return pos;
      });
      return {
        signal,
        overlays: [
          { label: `High ${p.entry}`, values: hi, color: "#facc15", dashed: true },
          { label: `Low ${p.exit}`, values: lo, color: "#38bdf8", dashed: true },
        ],
      };
    },
  },
];

// ---------- backtest ----------

// Signals are computed on a bar's close and filled at the next bar's open, so there is no lookahead.
const backtest = (cs: Candle[], signal: number[], start: number) => {
  let cash = START_EQUITY;
  let units = 0;
  let entry = 0;
  const trades: Trade[] = [];
  const returns: number[] = [];
  const equity: number[] = [];

  for (let i = start; i < cs.length; i++) {
    const want = signal[i - 1];
    if (want === 1 && units === 0) {
      units = (cash * (1 - FEE)) / cs[i].o;
      entry = cash;
      cash = 0;
      trades.push({ i, side: "B", price: cs[i].o });
    } else if (want === 0 && units > 0) {
      cash = units * cs[i].o * (1 - FEE);
      units = 0;
      returns.push(cash / entry - 1);
      trades.push({ i, side: "S", price: cs[i].o });
    }
    equity.push(cash + units * cs[i].c);
  }
  if (units > 0) returns.push(equity[equity.length - 1] / entry - 1);

  let peak = -Infinity;
  let maxDd = 0;
  for (const e of equity) {
    peak = Math.max(peak, e);
    maxDd = Math.min(maxDd, e / peak - 1);
  }
  const daily = equity.slice(1).map((e, i) => e / equity[i] - 1);
  const mean = daily.reduce((a, b) => a + b, 0) / (daily.length || 1);
  const sd = Math.sqrt(daily.reduce((a, b) => a + (b - mean) ** 2, 0) / (daily.length || 1));

  return {
    equity,
    trades,
    totalReturn: equity[equity.length - 1] / START_EQUITY - 1,
    maxDd,
    sharpe: sd === 0 ? 0 : (mean / sd) * Math.sqrt(365),
    roundTrips: returns.length,
    winRate: returns.length ? returns.filter((r) => r > 0).length / returns.length : 0,
  };
};

// ---------- data ----------

const parseKlines = (raw: (string | number)[][]): Candle[] =>
  raw
    .map((k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] }))
    // Drop today's still-forming candle.
    .filter((c) => c.t + DAY_MS <= Date.now());

const useBtcKlines = () => {
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [source, setSource] = useState<"live" | "snapshot" | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(LIVE_URL);
        if (!res.ok) throw new Error();
        const data = parseKlines(await res.json());
        if (!cancelled) {
          setCandles(data);
          setSource("live");
        }
      } catch {
        try {
          const res = await fetch(SNAPSHOT_URL);
          const data = parseKlines(await res.json());
          if (!cancelled) {
            setCandles(data);
            setSource("snapshot");
          }
        } catch {
          if (!cancelled) setError(true);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { candles, source, error };
};

// ---------- formatting ----------

const pct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
const usd = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });
const day = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
const tone = (v: number) => (v >= 0 ? "text-terminal_green" : "text-red-500");

// ---------- charts ----------

const W = 800;
const PRICE_H = 300;
const EQ_H = 140;
const PAD_R = 64;

const linePath = (values: Series, x: (i: number) => number, y: (v: number) => number) => {
  let d = "";
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
};

const PriceChart = ({
  cs,
  overlays,
  trades,
  hover,
  setHover,
}: {
  cs: Candle[];
  overlays: Overlay[];
  trades: Trade[];
  hover: number | null;
  setHover: (i: number | null) => void;
}) => {
  const plotW = W - PAD_R;
  const step = plotW / cs.length;
  const vals = [
    ...cs.flatMap((c) => [c.h, c.l]),
    ...overlays.flatMap((o) => o.values.filter((v): v is number => v !== null)),
  ];
  const min = Math.min(...vals) * 0.98;
  const max = Math.max(...vals) * 1.02;
  const x = (i: number) => i * step + step / 2;
  const y = (v: number) => PRICE_H - ((v - min) / (max - min)) * PRICE_H;
  const ticks = Array.from({ length: 5 }, (_, k) => min + ((max - min) * (k + 0.5)) / 5);

  return (
    <svg
      viewBox={`0 0 ${W} ${PRICE_H}`}
      className="w-full h-auto select-none"
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const i = Math.floor((((e.clientX - r.left) / r.width) * W) / step);
        setHover(i >= 0 && i < cs.length ? i : null);
      }}
    >
      {ticks.map((v) => (
        <g key={v}>
          <line x1={0} x2={plotW} y1={y(v)} y2={y(v)} stroke={UP} strokeOpacity={0.12} />
          <text x={plotW + 6} y={y(v) + 4} fontSize={11} fill={UP} fillOpacity={0.7}>
            {usd(v)}
          </text>
        </g>
      ))}
      {cs.map((c, i) => {
        const color = c.c >= c.o ? UP : DOWN;
        const top = y(Math.max(c.o, c.c));
        return (
          <g key={c.t}>
            <line x1={x(i)} x2={x(i)} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth={1} />
            <rect
              x={x(i) - step * 0.35}
              y={top}
              width={step * 0.7}
              height={Math.max(1, y(Math.min(c.o, c.c)) - top)}
              fill={color}
            />
          </g>
        );
      })}
      {overlays.map((o) => (
        <path
          key={o.label}
          d={linePath(o.values, x, y)}
          fill="none"
          stroke={o.color}
          strokeWidth={1.5}
          strokeDasharray={o.dashed ? "4 3" : undefined}
        />
      ))}
      {trades.map((t) => {
        const c = cs[t.i];
        const buy = t.side === "B";
        const cx = x(t.i);
        const cy = buy ? y(c.l) + 10 : y(c.h) - 10;
        const s = 6;
        const pts = buy
          ? `${cx},${cy - s} ${cx - s},${cy + s} ${cx + s},${cy + s}`
          : `${cx},${cy + s} ${cx - s},${cy - s} ${cx + s},${cy - s}`;
        return <polygon key={`${t.i}${t.side}`} points={pts} fill={buy ? UP : DOWN} stroke="#18181b" />;
      })}
      {hover !== null && (
        <line
          x1={x(hover)}
          x2={x(hover)}
          y1={0}
          y2={PRICE_H}
          stroke="#fff"
          strokeOpacity={0.3}
          strokeDasharray="3 3"
        />
      )}
    </svg>
  );
};

const EquityChart = ({
  strat,
  hold,
  hover,
}: {
  strat: number[];
  hold: number[];
  hover: number | null;
}) => {
  const plotW = W - PAD_R;
  const step = plotW / strat.length;
  const all = [...strat, ...hold, START_EQUITY];
  const min = Math.min(...all) * 0.98;
  const max = Math.max(...all) * 1.02;
  const x = (i: number) => i * step + step / 2;
  const y = (v: number) => EQ_H - ((v - min) / (max - min)) * EQ_H;

  return (
    <svg viewBox={`0 0 ${W} ${EQ_H}`} className="w-full h-auto">
      <line
        x1={0}
        x2={plotW}
        y1={y(START_EQUITY)}
        y2={y(START_EQUITY)}
        stroke={UP}
        strokeOpacity={0.25}
        strokeDasharray="4 4"
      />
      <text x={plotW + 6} y={y(START_EQUITY) + 4} fontSize={11} fill={UP} fillOpacity={0.7}>
        {usd(START_EQUITY)}
      </text>
      <path d={linePath(hold, x, y)} fill="none" stroke="#a1a1aa" strokeWidth={1.5} strokeDasharray="4 3" />
      <path d={linePath(strat, x, y)} fill="none" stroke={UP} strokeWidth={2} />
      {hover !== null && (
        <line x1={x(hover)} x2={x(hover)} y1={0} y2={EQ_H} stroke="#fff" strokeOpacity={0.3} strokeDasharray="3 3" />
      )}
    </svg>
  );
};

// ---------- main ----------

const defaults = (s: Strategy) => Object.fromEntries(s.params.map((p) => [p.key, p.def]));

const BtcBacktest = () => {
  const { candles, source, error } = useBtcKlines();
  const [stratId, setStratId] = useState("sma");
  const [params, setParams] = useState<Record<string, number>>(defaults(STRATEGIES[1]));
  const [hover, setHover] = useState<number | null>(null);
  const strategy = STRATEGIES.find((s) => s.id === stratId)!;

  const result = useMemo(() => {
    if (!candles || candles.length < 2) return null;
    const start = Math.max(1, candles.length - VISIBLE_DAYS);
    const { signal, overlays } = strategy.run(candles, params);
    const bt = backtest(candles, signal, start);
    const hold = backtest(candles, candles.map(() => 1), start);
    return {
      visible: candles.slice(start),
      overlays: overlays.map((o) => ({ ...o, values: o.values.slice(start) })),
      trades: bt.trades.map((t) => ({ ...t, i: t.i - start })),
      bt,
      hold,
    };
  }, [candles, strategy, params]);

  const pick = (s: Strategy) => {
    setStratId(s.id);
    setParams(defaults(s));
  };

  const card =
    "hover:bg-terminal_green/5 p-4 rounded-lg transition-all duration-300 border-l-4 border-transparent hover:border-terminal_green";

  if (error) return <div className={card}>Could not load BTC price data.</div>;
  if (!result) return <div className={`${card} animate-pulse`}>Loading BTC/USDT daily klines...</div>;

  const { visible, overlays, trades, bt, hold } = result;
  const shown = visible[hover ?? visible.length - 1];

  return (
    <div className={card}>
      <p className="md:text-base text-sm pb-4">
        BTC/USDT daily candles for the last ~6 months, backtested with a few classic strategies. Long-only,
        all-in, {FEE * 100}% fee per trade, signals filled at the next day&apos;s open.
      </p>
      <p className="md:text-sm text-xs mb-4 px-3 py-2 rounded-r border-l-4 border-terminal_green bg-terminal_green/10">
        The strategies here are textbook examples for illustration.{" "}
        <span className="font-bold">
          My own systematic strategies run live in production and are not shown.
        </span>
      </p>

      <div className="flex flex-wrap gap-2 pb-3">
        {STRATEGIES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pick(s)}
            className={`px-3 py-1 rounded border-2 font-bold text-xs md:text-sm transition-colors duration-200 ${
              s.id === stratId
                ? "bg-terminal_green text-black border-terminal_green"
                : "border-terminal_green/50 text-terminal_green hover:border-terminal_green"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
      <p className="text-xs md:text-sm opacity-80 pb-3">{strategy.desc}</p>

      {strategy.params.length > 0 && (
        <div className="grid md:grid-cols-3 grid-cols-1 gap-x-6 gap-y-2 pb-4 text-xs md:text-sm">
          {strategy.params.map((p) => (
            <label key={p.key} className="flex flex-col gap-1">
              <span>
                {p.label}: <span className="font-bold">{params[p.key]}</span>
              </span>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={params[p.key]}
                onChange={(e) => setParams({ ...params, [p.key]: Number(e.target.value) })}
                className="accent-terminal_green"
              />
            </label>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 pb-2 font-mono text-xs md:text-sm">
        <span className="font-bold">{day(shown.t)}</span>
        <span>
          O {usd(shown.o)} H {usd(shown.h)} L {usd(shown.l)}{" "}
          <span className={shown.c >= shown.o ? "text-terminal_green" : "text-red-500"}>C {usd(shown.c)}</span>
        </span>
      </div>

      <div className="rounded border border-terminal_green/30 p-1">
        <PriceChart cs={visible} overlays={overlays} trades={trades} hover={hover} setHover={setHover} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
        <span>
          <span className="text-terminal_green">▲</span> buy <span className="text-red-500">▼</span> sell
        </span>
        {overlays.map((o) => (
          <span key={o.label} style={{ color: o.color }}>
            ━ {o.label}
          </span>
        ))}
      </div>

      <p className="pt-4 pb-1 text-xs md:text-sm font-bold">
        Equity curve <span className="font-normal text-terminal_green">━ {strategy.name}</span>{" "}
        <span className="font-normal text-zinc-400">┅ Buy &amp; Hold</span>
      </p>
      <div className="rounded border border-terminal_green/30 p-1">
        <EquityChart strat={bt.equity} hold={hold.equity} hover={hover} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 font-mono text-xs md:text-sm">
        <div>
          Return
          <br />
          <span className={`font-bold ${tone(bt.totalReturn)}`}>{pct(bt.totalReturn)}</span>
        </div>
        <div>
          vs Buy &amp; Hold
          <br />
          <span className={`font-bold ${tone(bt.totalReturn - hold.totalReturn)}`}>
            {pct(bt.totalReturn - hold.totalReturn)}
          </span>
        </div>
        <div>
          Max drawdown
          <br />
          <span className="font-bold text-red-500">{pct(bt.maxDd)}</span>
        </div>
        <div>
          Sharpe
          <br />
          <span className={`font-bold ${tone(bt.sharpe)}`}>{bt.sharpe.toFixed(2)}</span>
        </div>
        <div>
          Trades / win rate
          <br />
          <span className="font-bold">
            {bt.roundTrips} / {(bt.winRate * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <p className="pt-4 text-xs opacity-60">
        {source === "live" ? "Live data from Binance" : "Snapshot data (live feed unavailable)"},{" "}
        {day(visible[0].t)} to {day(visible[visible.length - 1].t)}. For demonstration only, not investment
        advice.
      </p>
    </div>
  );
};

export default BtcBacktest;
