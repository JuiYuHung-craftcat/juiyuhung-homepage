"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Virtual filesystem: the resume, laid out as files under the home directory.
// ---------------------------------------------------------------------------

type FileNode = { type: "file"; content: () => string };
type DirNode = { type: "dir"; children: Record<string, Node> };
type Node = FileNode | DirNode;

const CAREER_START = new Date(2015, 10, 1).getTime(); // Nov 2015

const tenure = () =>
  ((Date.now() - CAREER_START) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2);

const file = (content: string | (() => string)): FileNode => ({
  type: "file",
  content: typeof content === "string" ? () => content : content,
});
const dir = (children: Record<string, Node>): DirNode => ({ type: "dir", children });

const FS: DirNode = dir({
  "about.txt": file(
    () => `JuiYuHung — Digital IC Design Engineer
Experience: ${tenure()} years

Products: TDMA, LTE, NR modem, AI accelerator, high-speed IO
(USB, HUB, DP, PCIe, Ethernet), TCP/IP protocol and HFT system.

Skilled at low cost, low power and low latency design.
Experienced in integration, front-end, middle-end and FPGA design flow.
Capable of building design verification environments in SystemVerilog.`,
  ),
  "contact.txt": file(`email   hi@juiyuhung.com
github  https://github.com/JuiYuHung-craftcat
web     https://juiyuhung.com`),
  experience: dir({
    "01-vici-holdings.txt": file(`VICI Holdings, Taiwan
Role:   HFT Digital Design Engineer
Period: Dec 2024 - now`),
    "02-algoltek.txt": file(`Algoltek, Taiwan
Role:   ASIC Design Engineer
Period: Apr 2022 - Dec 2024`),
    "03-memryx.txt": file(`MemryX, Taiwan
Role:   ASIC Design Engineer
Period: Sep 2020 - Apr 2022`),
    "04-mediatek.txt": file(`Mediatek, Taiwan
Role:   ASIC Design Engineer
Period: Nov 2015 - Sep 2020`),
  }),
  education: dir({
    "master.txt": file(`National Tsing-Hua University, Taiwan
Master of Engineering, Department of Electrical Engineering — Jul 2015

- Expertise field: memory integrated circuit designs
- Major in High-Speed Memory Sense Amplifier design
- Conducted projects of SRAM, NV-TCAM, RRAM, NAND-Flash, 3D-TSV`),
    "bachelor.txt": file(`National Tsing-Hua University, Taiwan
Bachelor of Engineering, Department of Electrical Engineering — Jun 2013

- Graduated with the top-rated prize`),
  }),
  skills: dir({
    "languages.txt": file(
      "Verilog-2005, SystemVerilog, Tcl, C/C++, Perl, Lua, Rust,\nJavascript, Typescript, SQL",
    ),
    "tools.txt": file(
      "VCS, Xrun, Verdi, Simvision, DC, Genus, VC Formal, LEC, STA,\nSG-lint, SG-cdc, PTPX, Power-Artist, Vivado",
    ),
    "frameworks.txt": file("UVM"),
  }),
  publications: dir({
    "papers.txt": file(`[1] "A 256b-wordlength ReRAM-based TCAM with 1ns search-time and 14x
    improvement in wordlength-energy-efficiency-density product using
    2.5T1R cell"
    IEEE International Solid-State Circuits Conference (ISSCC), Feb 2016.

[2] "A low-power subthreshold-to-superthreshold level-shifter for sub-0.5V
    embedded resistive RAM (ReRAM) macro in ultra low-voltage chips"
    IEEE Asia Pacific Conference on Circuits and Systems (APCCAS), Nov 2014.`),
    "patents.txt": file(`"Sense Amplifier", United States Patent US 9378780 B1, Jun 2015`),
  }),
  projects: dir({
    "btc-backtest.txt": file(`Crypto BTC Strategy & Backtest
A trading strategy backtested on daily BTC data.
Run \`open resume\` to see the interactive chart on the resume page.`),
  }),
  ".secret": file(`You found the hidden file. 🎉
The fastest path between two flip-flops is the one without a mux.`),
});

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

const resolvePath = (cwd: string[], path: string): string[] | null => {
  const parts = path.startsWith("~") || path.startsWith("/") ? [] : [...cwd];
  const segs = path.replace(/^~\/?/, "").replace(/^\/+/, "").split("/");
  for (const seg of segs) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts;
};

const getNode = (parts: string[]): Node | null => {
  let node: Node = FS;
  for (const p of parts) {
    if (node.type !== "dir" || !(p in node.children)) return null;
    node = node.children[p];
  }
  return node;
};

const fmtPath = (parts: string[]) => (parts.length ? "~/" + parts.join("/") : "~");

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

const Hl = ({ children }: { children: ReactNode }) => (
  <span className="text-white font-bold">{children}</span>
);

const listDir = (node: DirNode, all: boolean) => {
  const names = Object.keys(node.children).filter((n) => all || !n.startsWith("."));
  return (
    <div className="flex flex-wrap gap-x-6">
      {names.map((n) => (
        <span key={n} className={node.children[n].type === "dir" ? "text-sky-400 font-bold" : ""}>
          {n}
          {node.children[n].type === "dir" ? "/" : ""}
        </span>
      ))}
    </div>
  );
};

const tree = (node: DirNode, prefix = ""): string[] => {
  const names = Object.keys(node.children).filter((n) => !n.startsWith("."));
  return names.flatMap((name, i) => {
    const last = i === names.length - 1;
    const child = node.children[name];
    const line = `${prefix}${last ? "└── " : "├── "}${name}${child.type === "dir" ? "/" : ""}`;
    return child.type === "dir"
      ? [line, ...tree(child, prefix + (last ? "    " : "│   "))]
      : [line];
  });
};

const catDir = (dirName: string) => {
  const node = FS.children[dirName] as DirNode;
  return Object.keys(node.children)
    .map((n) => (node.children[n] as FileNode).content())
    .join("\n\n");
};

const HELP: [string, string][] = [
  ["help", "show this list"],
  ["whoami", "a one-line introduction"],
  ["ls [-a] [dir]", "list files"],
  ["cd <dir>", "change directory"],
  ["cat <file>", "print a file"],
  ["tree", "show the whole resume layout"],
  ["pwd", "print working directory"],
  ["about", "shortcut: cat ~/about.txt"],
  ["experience", "shortcut: every job, newest first"],
  ["education", "shortcut: degrees"],
  ["skills", "shortcut: languages, tools, frameworks"],
  ["publications", "shortcut: papers and patents"],
  ["contact", "how to reach me"],
  ["neofetch", "system info, résumé edition"],
  ["open <resume|posts|github|mail>", "open a page"],
  ["history", "previous commands"],
  ["clear", "clear the screen (Ctrl+L)"],
];

const COMMANDS = [
  ...HELP.map(([c]) => c.split(" ")[0]),
  "echo",
  "date",
  "uname",
  "sudo",
  "exit",
];

const BANNER = (
  <div className="space-y-1">
    <pre className="!p-0 !text-terminal_green text-[10px] sm:text-xs leading-tight overflow-x-auto">
{`   _       _ __   __     _   _
  (_)_   _(_)\\ \\ / /   _| | | |_   _ _ __   __ _
  | | | | | |\\ V / | | | |_| | | | | '_ \\ / _\` |
  | | |_| | | | || |_| |  _  | |_| | | | | (_| |
 _/ |\\__,_|_| |_| \\__,_|_| |_|\\__,_|_| |_|\\__, |
|__/                                       |___/ `}
    </pre>
    <p>
      Welcome to JuiYuHung&apos;s résumé shell. Type <Hl>help</Hl> to see commands, or try{" "}
      <Hl>ls</Hl>, <Hl>cat about.txt</Hl>, <Hl>experience</Hl>.
    </p>
    <p className="opacity-60">Tab completes, ↑/↓ walks history.</p>
  </div>
);

type Entry = { id: number; prompt?: string; input?: string; output?: ReactNode };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Terminal() {
  const [entries, setEntries] = useState<Entry[]>([{ id: 0, output: BANNER }]);
  const [cwd, setCwd] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const idRef = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries]);

  const prompt = fmtPath(cwd);

  const run = (raw: string): { output?: ReactNode; clear?: boolean; cwd?: string[] } => {
    const line = raw.trim();
    if (!line) return {};
    const [cmd, ...args] = line.split(/\s+/);
    const flags = args.filter((a) => a.startsWith("-"));
    const targets = args.filter((a) => !a.startsWith("-"));

    switch (cmd) {
      case "help":
      case "man":
        return {
          output: (
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
              {HELP.map(([c, d]) => (
                <div key={c} className="contents">
                  <Hl>{c}</Hl>
                  <span className="opacity-80">{d}</span>
                </div>
              ))}
            </div>
          ),
        };
      case "whoami":
        return {
          output: `JuiYuHung — digital IC design engineer, ${tenure()} years in. Currently building HFT hardware at VICI Holdings.`,
        };
      case "pwd":
        return { output: "/home/juiyuhung" + (cwd.length ? "/" + cwd.join("/") : "") };
      case "ls": {
        const parts = resolvePath(cwd, targets[0] ?? ".");
        const node = parts && getNode(parts);
        if (!node) return { output: `ls: cannot access '${targets[0]}': No such file or directory` };
        if (node.type === "file") return { output: targets[0] };
        return { output: listDir(node, flags.some((f) => f.includes("a"))) };
      }
      case "cd": {
        const parts = resolvePath(cwd, targets[0] ?? "~");
        const node = parts && getNode(parts);
        if (!node) return { output: `cd: ${targets[0]}: No such file or directory` };
        if (node.type !== "dir") return { output: `cd: ${targets[0]}: Not a directory` };
        return { cwd: parts! };
      }
      case "cat": {
        if (!targets.length) return { output: "cat: missing file operand. Try `ls`." };
        return {
          output: targets
            .map((t) => {
              const node = getNode(resolvePath(cwd, t) ?? []);
              if (!node) return `cat: ${t}: No such file or directory`;
              if (node.type === "dir") return `cat: ${t}: Is a directory (try \`ls ${t}\`)`;
              return node.content();
            })
            .join("\n\n"),
        };
      }
      case "tree":
        return { output: ["~", ...tree(FS)].join("\n") };
      case "about":
        return { output: (FS.children["about.txt"] as FileNode).content() };
      case "experience":
      case "education":
      case "skills":
      case "publications":
        return { output: catDir(cmd) };
      case "contact":
        return { output: (FS.children["contact.txt"] as FileNode).content() };
      case "neofetch":
        return {
          output: (
            <div className="flex flex-col sm:flex-row gap-x-6 gap-y-2">
              <pre className="!p-0 !text-terminal_green leading-tight">
{`   .--.
  |o_o |
  |:_/ |
 //   \\ \\
(|     | )
/'\\_   _/\`\\
\\___)=(___/`}
              </pre>
              <div>
                <p>
                  <Hl>guest@juiyuhung</Hl>
                </p>
                <p>-----------------</p>
                <p><Hl>OS</Hl>: JuiYuHung OS (silicon edition)</p>
                <p><Hl>Uptime</Hl>: {tenure()} years in industry</p>
                <p><Hl>Host</Hl>: VICI Holdings, Taiwan</p>
                <p><Hl>Role</Hl>: HFT Digital Design Engineer</p>
                <p><Hl>Shell</Hl>: SystemVerilog + Tcl</p>
                <p><Hl>Packages</Hl>: VCS, Verdi, DC, Genus, Vivado, UVM</p>
                <p><Hl>Specialty</Hl>: low cost · low power · low latency</p>
              </div>
            </div>
          ),
        };
      case "open": {
        const links: Record<string, string> = {
          resume: "/",
          posts: "/posts",
          github: "https://github.com/JuiYuHung-craftcat",
          mail: "mailto:hi@juiyuhung.com",
        };
        const target = targets[0];
        if (!target || !links[target])
          return { output: "usage: open <resume|posts|github|mail>" };
        window.open(links[target], links[target].startsWith("/") ? "_self" : "_blank");
        return { output: `Opening ${target}...` };
      }
      case "history":
        return { output: history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join("\n") };
      case "echo":
        return { output: args.join(" ") };
      case "date":
        return { output: new Date().toString() };
      case "uname":
        return { output: flags.length ? "JuiYuHungOS 2015.11 silicon-x86_64 GNU/Verilog" : "JuiYuHungOS" };
      case "sudo":
        return { output: "guest is not in the sudoers file. This incident will be reported. 🙂" };
      case "exit":
        return { output: "There is no escape. Try `open resume` instead." };
      case "clear":
        return { clear: true };
      default:
        return { output: `${cmd}: command not found. Type \`help\` for the list.` };
    }
  };

  const submit = (value: string) => {
    const result = run(value);
    if (value.trim()) setHistory((h) => [...h, value.trim()]);
    setHistIdx(null);
    setInput("");
    if (result.clear) {
      setEntries([]);
      return;
    }
    setEntries((e) => [
      ...e,
      { id: idRef.current++, prompt, input: value, output: result.output },
    ]);
    if (result.cwd) setCwd(result.cwd);
  };

  const complete = () => {
    const parts = input.split(/\s+/);
    if (parts.length <= 1) {
      const matches = COMMANDS.filter((c) => c.startsWith(parts[0]));
      if (matches.length === 1) setInput(matches[0] + " ");
      else if (matches.length > 1)
        setEntries((e) => [...e, { id: idRef.current++, prompt, input, output: matches.join("  ") }]);
      return;
    }
    const partial = parts[parts.length - 1];
    const slash = partial.lastIndexOf("/");
    const dirPart = slash >= 0 ? partial.slice(0, slash + 1) : "";
    const namePart = slash >= 0 ? partial.slice(slash + 1) : partial;
    const node = getNode(resolvePath(cwd, dirPart || ".") ?? []);
    if (!node || node.type !== "dir") return;
    const matches = Object.keys(node.children).filter(
      (n) => n.startsWith(namePart) && (namePart.startsWith(".") || !n.startsWith(".")),
    );
    if (matches.length === 1) {
      const m = matches[0];
      parts[parts.length - 1] = dirPart + m + (node.children[m].type === "dir" ? "/" : "");
      setInput(parts.join(" "));
    } else if (matches.length > 1) {
      setEntries((e) => [...e, { id: idRef.current++, prompt, input, output: matches.join("  ") }]);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      submit(input);
    } else if (e.key === "Tab") {
      e.preventDefault();
      complete();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const idx = histIdx === null ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      setInput(history[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx === null) return;
      const idx = histIdx + 1;
      if (idx >= history.length) {
        setHistIdx(null);
        setInput("");
      } else {
        setHistIdx(idx);
        setInput(history[idx]);
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setEntries([]);
    } else if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      setEntries((en) => [...en, { id: idRef.current++, prompt, input: input + "^C" }]);
      setInput("");
    }
  };

  const PromptLabel = ({ path }: { path: string }) => (
    <span className="shrink-0">
      <span className="text-terminal_green font-bold">guest@juiyuhung</span>
      <span className="text-white">:</span>
      <span className="text-sky-400 font-bold">{path}</span>
      <span className="text-white">$&nbsp;</span>
    </span>
  );

  const QUICK = ["help", "whoami", "ls", "experience", "skills", "neofetch", "clear"];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border-2 border-terminal_green/40 bg-black overflow-hidden shadow-[0_0_30px_rgba(0,187,0,0.15)]">
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border-b border-terminal_green/30">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <span className="h-3 w-3 rounded-full bg-green-500/80" />
          <span className="ml-2 text-xs text-zinc-400 truncate">guest@juiyuhung: {prompt}</span>
        </div>
        <div
          ref={scrollRef}
          onClick={() => {
            if (!window.getSelection()?.toString()) inputRef.current?.focus();
          }}
          className="h-[65vh] min-h-[320px] overflow-y-auto p-3 md:p-4 font-mono text-xs md:text-sm leading-relaxed cursor-text"
        >
          {entries.map((en) => (
            <div key={en.id} className="mb-1">
              {en.prompt !== undefined && (
                <div className="flex flex-wrap break-all">
                  <PromptLabel path={en.prompt} />
                  <span className="text-zinc-100">{en.input}</span>
                </div>
              )}
              {en.output !== undefined && (
                <div className="whitespace-pre-wrap break-words text-zinc-300">{en.output}</div>
              )}
            </div>
          ))}
          <div className="flex items-center">
            <PromptLabel path={prompt} />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              autoFocus
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Terminal input"
              className="flex-1 min-w-0 bg-transparent outline-none text-zinc-100 caret-terminal_green"
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK.map((c) => (
          <button
            key={c}
            onClick={() => {
              submit(c);
              inputRef.current?.focus();
            }}
            className="font-mono text-xs md:text-sm px-2 py-1 rounded border border-terminal_green/50 hover:bg-terminal_green hover:text-black transition-colors"
          >
            $ {c}
          </button>
        ))}
      </div>
    </div>
  );
}
