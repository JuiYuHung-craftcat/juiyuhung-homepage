---
title: "HKEX Connectivity 101: the OMD-C Quote Feed and the OCG-C Order Gateway"
date: 2026-11-26
type: trading
summary: "An introduction to trading Hong Kong equities: HKEX's Orion Market Data feed (OMD-C), a little-endian binary multicast with order-by-order and aggregated books, and the Orion Central Gateway (OCG-C) with its FIX and binary order entry protocols."
---

After [Taiwan's TWSE](/posts/twse-ip-feed-and-fix) and [TAIFEX](/posts/taifex-ip-feed-and-tmp), the third stop is Hong Kong. Hong Kong Exchanges and Clearing (HKEX) runs its securities market on the **Orion** platform, and again there are two pipes:

1. **OMD-C (Orion Market Data, Securities Market)**: the market data feed.
2. **OCG-C (Orion Central Gateway, Securities Market)**: the order gateway, offering both a **FIX** and a **binary** protocol.

The derivatives market (futures and options) has its own pair, OMD-D for data and a separate trading platform for orders. This post focuses on cash equities.

> HKEX revises these interface specifications regularly. Treat this post as an orientation guide and the official documents (linked at the end) as the source of truth.

## A different design philosophy

The Taiwan feeds are packed-BCD records with ASCII markers. HKEX looks more like a modern Western exchange:

- **Native binary integers** (little-endian) instead of BCD.
- **Packets that carry several messages**, each with a small size/type header.
- **Order-by-order data** available, not just a top-of-book snapshot.
- **Separate recovery services** for gap filling and for late joiners.

## Part 1: OMD-C, the market data feed

### Products: how much detail do you need?

OMD-C is sold as several feed products built from the same message set:

| Product | Book depth | Typical user |
|---|---|---|
| **Securities Standard (SS)** | Aggregated price levels (top 10) | Vendors, displays, most algos |
| **Securities Premium (SP)** | Order-by-order, full depth | Market makers, latency-sensitive strategies |
| **Securities FullTick (SF)** | Full depth, every tick | Full-book and analytics use |

Index data and Stock Connect information come on their own feeds.

### Packets and messages

Data arrives over **UDP multicast**, on **two redundant lines (A and B)** carrying identical content. Each datagram is a packet:

```
+---------------- packet header -----------------+
| PktSize | MsgCount | Filler | SeqNum | SendTime |
+------------------------------------------------+
| MsgSize | MsgType |  ...message body...        |   <- message 1
| MsgSize | MsgType |  ...message body...        |   <- message 2
| ...                                            |
```

- `SeqNum` is the sequence number of the **first** message in the packet. Each following message implicitly takes the next number. Gap detection is therefore per message, per channel.
- Every message starts with `MsgSize` and `MsgType` (both `uint16`), so a parser can skip types it doesn't care about without understanding them.
- A packet with **zero messages** acts as a heartbeat.

Line arbitration is simple: take each sequence number from whichever line delivers it first, and drop the duplicate from the other line.

### The messages you'll actually use

| MsgType | Message | Purpose |
|---|---|---|
| 11 | Security Definition | Static data: lot size, currency, spread table, etc. |
| 20 | Trading Session Status | Market-wide session state (pre-opening, continuous, closing auction…) |
| 21 | Security Status | Per-security state, such as halts |
| **30** | **Add Order** | New order in the book (order-by-order feeds) |
| **31** | **Modify Order** | Quantity change on an existing order |
| **32** | **Delete Order** | Order removed |
| 33 / 34 | Add / Delete Odd Lot Order | Odd-lot orders, which live in a separate book |
| 50 | Trade | Executions |
| **53** | **Aggregate Order Book Update** | Price-level updates (aggregated feeds) |
| 60 | Statistics | Open, high, low, volume, turnover |
| 100 | Sequence Reset | Resynchronize your sequence tracking |

A single Aggregate Order Book Update (53) can carry several entries at once: new levels, changed levels, deleted levels, or a "clear the whole book" instruction. That keeps the aggregated book consistent message by message.

### Prices are scaled integers

Prices are integers with **implied decimals**, so decoding is one integer load plus a scale factor fixed by the spec. Hong Kong also uses a **spread table**: the tick size depends on the price band a stock is trading in. Validate prices against the right band before you send orders.

### Recovering from gaps

OMD-C has two recovery paths, and you'll want both:

1. **Retransmission Service (RTS)**: a TCP service. Log on, then request a range of sequence numbers on a given channel. Use it for **small gaps**.
2. **Refresh Service**: a multicast loop that periodically republishes a **snapshot** of current state per channel: books, latest statuses, statistics. Use it to **start up late** or recover from a **large gap**. Join the refresh, rebuild state, then resume the real-time feed from the snapshot's sequence number.

In software or on an FPGA, the shape is the same: A/B arbitration → sequence check → message demux by `MsgType` → per-security book update. Recovery runs on the side and marks books stale until they're repaired.

## Part 2: OCG-C, the order gateway

### Finding the gateway

OCG-C starts with a **Lookup Service**. The client connects to one of the published lookup endpoints, asks where its session should go, and gets back the IP and port of its order-flow gateway. Only then does it open the trading session. This lets HKEX move sessions between gateways and sites without every participant changing their configuration.

### Two protocols, one model

OCG-C offers two order entry protocols:

- **FIX 5.0 SP2** (with the FIXT 1.1 session layer), the familiar tag=value text format.
- **A binary protocol** with fixed-layout fields, designed for lower parsing cost.

The binary protocol follows **FIX 5.0 SP2 terminology, message types and flows**. A NewOrderSingle is still a NewOrderSingle, and an ExecutionReport still reports fills. Only the encoding changes. That makes migrating from FIX to binary mostly a serialization change, not a redesign.

Session logon uses a HKEX-assigned **CompID**. Passwords are encrypted with an RSA public key that HKEX distributes separately.

### Messages

| Message | Direction | Purpose |
|---|---|---|
| NewOrderSingle | Client → HKEX | New order |
| OrderCancelRequest | Client → HKEX | Cancel |
| OrderCancelReplaceRequest | Client → HKEX | Amend price or quantity |
| OrderMassCancelRequest | Client → HKEX | Cancel many orders at once |
| ExecutionReport | HKEX → Client | Acks, fills, cancels, rejects |
| OrderCancelReject | HKEX → Client | A cancel or amend was refused |
| TradeCaptureReport | Both | Reporting off-exchange (manual) trades |
| BusinessMessageReject | HKEX → Client | Application-level reject |

A separate **drop copy** session can mirror your executions to a risk or back-office system.

### Hong Kong market rules that hit your order logic

- **Board lots vary by stock.** One lot might be 100 shares for one stock and 2,000 for another. Read the lot size from the static data. Odd lots go to a separate book.
- **Order types are market-specific.** Continuous trading uses limit-style orders (enhanced limit, special limit). The auction sessions (pre-opening and closing auction) use at-auction and at-auction limit orders.
- **Short selling must be flagged**, and is only allowed in designated securities.
- **No daily price limits like Taiwan's**, but a **volatility control mechanism (VCM)** can trigger a short cooling-off period on eligible stocks when the price moves too far, too fast.
- **Throttles are bought per session.** Each session has a message rate limit. Pace in your gateway instead of discovering the limit through rejects.

## Taiwan vs Hong Kong at a glance

| | TWSE / TAIFEX | HKEX securities |
|---|---|---|
| Market data encoding | Packed BCD, ASCII markers, XOR checksum | Little-endian binary integers |
| Framing | One record per message | Packets of several messages |
| Book data | Best five levels | Aggregated top 10, or full order-by-order |
| Gap recovery | Exchange retransmission | RTS (TCP) plus Refresh snapshots (multicast) |
| Order protocol | FIX (TWSE), TMP binary (TAIFEX) | FIX 5.0 SP2 or FIX-modeled binary |
| Price limits | Daily limit-up and limit-down | Volatility control mechanism |

For a hardware-accelerated design, OMD-C is friendly: fixed-width little-endian fields, an explicit size on every message, and a clean separation between real-time data and recovery. The OCG-C binary protocol pairs naturally with it on the order side.

## References

- HKEX, *OMD-C Binary Interface Specifications*: [hkex.com.hk](https://www.hkex.com.hk/eng/prod/dataprod/Documents/HKEX_OMD-C_Binary_Interface_Specifications_v1.39b.pdf)
- HKEX, *OMD-C Developers Guide*: [hkex.com.hk](https://www.hkex.com.hk/chi/prod/dataprod/Documents/HKEX_OMD-C_Developers_Guide_1_15.pdf)
- HKEX, *OCG-C Binary Trading Interface Specifications*: [hkex.com.hk](https://www.hkex.com.hk/-/media/HKEX-Market/Services/Trading/Securities/Infrastructure/OCGC/HKEX_OCGC_Binary_Trading_Interface_Specifications_v3_0-(20210917)-(clean).pdf)
- HKEX, *OCG-C FIX Trading Interface Specifications*: [hkex.com.hk](https://www.hkex.com.hk/-/media/HKEX-Market/Services/Trading/Securities/Infrastructure/OCGC/HKEX_OCGC_FIX_Trading_Interface_Specifications_v3_0-(20210917)-(clean).pdf?la=en)
- HKEX, *OCG-C Connectivity Guide*: [hkex.com.hk](https://www.hkex.com.hk/-/media/HKEX-Market/Services/Trading/Securities/Infrastructure/OCGC/HKEX_OCGC_Connectivity_Guide-(v3,-d-,0)-(20210917)-(clean).pdf?la=en)
