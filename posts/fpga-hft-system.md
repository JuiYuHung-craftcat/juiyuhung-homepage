---
title: "Anatomy of an FPGA HFT System: from Photon to Order"
date: 2026-11-27
type: tech
summary: "How a hardware trading system turns a market data packet into an order in well under a microsecond: the latency budget, the pipeline block by block, the hardware/software split, and how to verify it all."
---

In the previous posts I walked through the exchange protocols of [TWSE](/posts/twse-ip-feed-and-fix), [TAIFEX](/posts/taifex-ip-feed-and-tmp) and [HKEX](/posts/hkex-omd-and-ocg). This post looks at the other side of the wire: the system that consumes those feeds and sends those orders, built on an **FPGA** instead of a CPU.

## Why put trading logic in hardware?

A well-tuned software stack (kernel bypass, pinned cores, busy polling) can react to a market data packet in a few microseconds. That's fast, but it has two problems:

1. **Latency.** Every packet still crosses the NIC, PCIe, the memory hierarchy and an instruction stream before an order goes out.
2. **Jitter.** Caches, interrupts, branch mispredictions and the operating system make the *tail* latency much worse than the median. In a race, the tail is what loses you trades.

An FPGA sits directly on the network ports and processes bytes **as they arrive on the wire**, in a fixed number of clock cycles. The result is a **tick-to-trade** latency (market data in → order out) that can be measured in **hundreds of nanoseconds or less**, and, just as importantly, that is **nearly constant** from one packet to the next.

## The latency budget

It helps to think of tick-to-trade as a budget split across stages:

| Stage | What happens |
|---|---|
| Wire → PHY/MAC (RX) | Serial bits recovered, Ethernet frame delineated |
| Network filtering | Match the multicast group, IP/UDP ports |
| Feed handling | A/B line arbitration, sequence checking |
| Decoding | Extract fields from the exchange message |
| Book update | Apply the change to the order book |
| Decision | Strategy logic decides whether to trade |
| Risk checks | Pre-trade limits, enforced in hardware |
| Order encoding | Build the exchange order message |
| TCP/MAC/PHY (TX) | Wrap in TCP/IP/Ethernet and serialize onto the wire |

At 10 or 25 Gb/s, one clock cycle at a few hundred MHz is a few nanoseconds. Each stage costs a handful of cycles, so **every cycle shaved anywhere in the chain matters**.

## The pipeline, block by block

```
            ┌──────────────────────── FPGA ─────────────────────────┐
 Exchange   │                                                        │
 feed A ───►│ MAC ─► UDP/IP filter ─┐                                │
 feed B ───►│ MAC ─► UDP/IP filter ─┴► A/B arb ─► decoder ─► book    │
            │                                               │        │
            │                              trigger tables ◄─┤        │
            │                                     │         ▼        │
            │                                     └──► decision      │
            │                                               │        │
 Exchange   │                                               ▼        │
 order  ◄───│ MAC ◄─ TCP engine ◄─ order encoder ◄─ risk checks       │
 gateway    │                                                        │
            │          ▲ PCIe (config, tables, logs) ▼               │
            └────────────────────────────────────────────────────────┘
                                      Host CPU
```

### 1. Low-latency MAC and PHY

Standard Ethernet IP cores are built for throughput and often buffer whole frames (store-and-forward). A trading MAC is **cut-through**: it passes each data word to the next stage as soon as it's decoded, long before the frame's CRC arrives. If the CRC later turns out bad, downstream logic has to be able to discard what it already started.

### 2. Network filtering

Most traffic on a market data link is irrelevant to a given strategy. A small block matches the Ethernet type, IP multicast group and UDP port in the first few words of the frame, and drops everything else before it costs any work downstream.

### 3. Feed handler: A/B arbitration and sequencing

Exchanges send identical data on two lines (A and B). The feed handler takes whichever copy of each sequence number arrives first, drops the duplicate, and **flags gaps**. Recovery (retransmission or snapshots) is slow and rare, so it's usually handled in **software**. The hardware only marks the affected books as stale until software repairs them.

### 4. Decoder

This is where exchange protocol design shows up directly in your logic:

- A **fixed-layout binary** message (like HKEX OMD-C) is ideal: every field sits at a known byte offset, so decoding is just wiring. Fields are available the moment their bytes arrive.
- **Packed BCD** (like the TWSE and TAIFEX feeds) needs a BCD-to-binary conversion, a small adder tree per field. It's cheap, but it costs a cycle or two.
- **Variable-length** layouts, like a bitmap that says how many price levels follow, need a small state machine to steer each field to the right place.

A good decoder doesn't wait for the whole message. It starts acting on the fields it needs as soon as they appear on the bus.

### 5. Order book

The book lives in on-chip memory (BRAM/URAM), indexed by instrument. For a top-of-book strategy you might keep only the best few levels per instrument in registers. For a full-depth book you need a structure that handles insert, modify and delete at arbitrary price levels in a fixed number of cycles. That's one of the harder pieces to design well.

### 6. Decision: software decides, hardware fires

Complex strategy logic is hard to build and change in RTL. The common pattern is a **split brain**:

- **Software** on the host runs the real strategy: models, signals, parameters. It continuously precomputes *what to do if X happens*, and writes those answers into **trigger tables** in the FPGA.
- **Hardware** only evaluates simple conditions against the tables, for example "if the best ask on instrument N drops to or below price P, send this buy order". When the condition hits, it fires immediately.

This keeps the hot path tiny and deterministic, while strategy logic stays in software, where it can be changed daily.

### 7. Pre-trade risk checks

Before any order leaves, hardware enforces the risk limits: maximum order size, price bands around a reference price, position and credit limits, order rate limits, and a **kill switch** that stops everything. These checks run in parallel with order encoding, so they add almost no latency. Because they protect real money, they're the part of the design that most deserves **formal verification**.

### 8. Order encoder

Most of an order message is the same every time: session IDs, account and static flags. The encoder keeps **pre-built templates** and patches only the hot fields on the fly: price, quantity, order ID, side, and any length or checksum fields that depend on them. A binary protocol (like TAIFEX TMP or HKEX's binary order entry protocol) makes this much simpler than text FIX, where you also have to format numbers as ASCII and recompute the FIX `BodyLength` and `CheckSum`.

### 9. TCP in hardware

Order entry runs over TCP, and a complete TCP stack in RTL is a big project. A common compromise is a **hybrid**:

- **Software** owns the connection: handshake, retransmission, window management, and the slow, rare edge cases.
- **Hardware** owns the hot path: when an order fires, it builds the TCP/IP/Ethernet headers itself, using sequence and acknowledgement numbers that software keeps in sync, and puts the segment on the wire directly.

The exchange sees one normal TCP stream. Inside the box, the fast path never touches the CPU.

## Clocks, time and measurement

- **Clock domains.** The network transceivers run on their own recovered clocks, while the core logic may run in another domain. Every clock domain crossing costs latency and must be synchronized correctly. Good designs minimize crossings on the hot path.
- **Timestamping.** Hardware timestamps on ingress and egress, disciplined by PTP or a similar clock source, are how you measure tick-to-trade honestly. They're also what regulators and post-trade analysis expect.
- **Measure outside the box.** The most trustworthy latency numbers come from a network tap or capture device that sees both the market data in and the order out, and compares their timestamps.

## Verification: where most of the work goes

A bug in a trading FPGA can send a lot of wrong orders very quickly. Verification usually takes more effort than design:

- **A golden model** in C++ or Python implements the same feed handling, book and trigger logic, and serves as the reference.
- **Simulation with SystemVerilog/UVM** drives randomized and directed traffic through the RTL and compares it against the golden model, cycle by cycle where it matters.
- **Replay of captured market data** (pcap files from real trading days) catches the protocol corner cases that synthetic tests miss: sequence resets, halts, auctions, odd lots.
- **Formal verification** proves safety properties of the risk checks, such as "no order exceeds the maximum quantity" or "nothing is sent after the kill switch".
- **Lab testing** against exchange test environments before anything touches production.

## Trade-offs

FPGAs aren't free speed:

- **Development cost.** RTL plus verification takes far longer than equivalent software, and engineers who know both hardware and trading are rare.
- **Flexibility.** Changing a strategy means a rebuild and re-verification, which is why the software-decides/hardware-fires split matters.
- **Build times.** Place-and-route for a large, high-frequency design can take hours, and timing closure at high clock rates is a craft of its own.
- **HLS vs RTL.** High-level synthesis speeds development for complex logic, but the most latency-critical paths are usually still hand-written RTL.

The payoff is a system whose speed comes from the physics of the logic rather than from the luck of the cache, which is why FPGAs have become a standard tool in latency-sensitive trading.

## Wrapping up

An FPGA trading system is a pipeline: receive, filter, arbitrate, decode, update the book, decide, check risk, encode and transmit, with every stage designed to start before the previous one has finished. Most of the art lies in the split between what the hardware does on every packet and what the software does in the background, and in verifying that the hardware does exactly what it should, every single time.
