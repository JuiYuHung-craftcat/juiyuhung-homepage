---
title: "TAIFEX Connectivity 101: the IP Quote Feed and the TMP Order Protocol"
date: 2026-11-26
type: trading
summary: "An introduction to trading on the Taiwan Futures Exchange: the I-coded market data feed (I010, I020, I080, I081…) and TMP, TAIFEX's binary order entry protocol with its L-series session and R-series order messages."
---

The Taiwan Futures Exchange (TAIFEX, 臺灣期貨交易所) lists TAIEX futures (TX), mini-TAIEX (MTX), TAIEX options (TXO), stock futures and more. Like TWSE, it gives you two pipes:

1. **The quote feed** (行情資訊傳輸網路): market data pushed to you over IP.
2. **TMP (TAIFEX Message Protocol)**: TAIFEX's own **binary** order entry protocol over TCP. TAIFEX also offers FIX, but TMP is the native, compact option and the usual choice for latency-sensitive systems.

This post walks through both at an introductory level.

> TAIFEX revises both specs several times a year. TMP alone went from v2.13 (2020) to v2.18.x (2026). Use the official documents linked at the end for exact layouts.

## Part 1: The quote feed

### Two coordinates: transmission code and message kind

Every TAIFEX market data message begins with an envelope that looks familiar if you've seen the TWSE feed:

| Field | Purpose |
|---|---|
| `ESC-CODE` | `0x1B`, start of message |
| `TRANSMISSION-CODE` | Which product family and stream (e.g. futures basic data vs futures real-time quotes; options have their own codes) |
| `MESSAGE-KIND` | Which message within that stream |
| `INFORMATION-TIME` | Exchange timestamp, packed BCD |
| `INFORMATION-SEQ` | Sequence number for gap detection |
| `VERSION-NO` | Message layout version |
| `BODY-LENGTH` | Length of the body that follows |
| body | Message-specific fields |
| `CHECK-SUM` | Integrity check |
| `TERMINAL-CODE` | `0x0D 0x0A` |

`TRANSMISSION-CODE` + `MESSAGE-KIND` map to the **I-codes** that everyone uses when talking about the feed. In recent manuals, for example, transmission code `1` carries futures reference data such as basic info and price limits, and `2` carries futures real-time quotes.

### The I-codes you'll actually use

| I-code | What it is | When |
|---|---|---|
| **I010** | Product basic info (商品基本資料): product ID, reference price, limits, and the **decimal locator** for prices | Before the open |
| **I020** | Trade price and volume (成交價量揭示) | Intraday |
| **I021** | Intraday high and low | Intraday |
| **I080** | Best five levels, bid and ask (委託簿揭示), sent when the top five change | Intraday |
| **I081** | Order book *update* message in the continuous (逐筆) feed: incremental changes to the book | Intraday |
| **I140** | System and status notices | As needed |

The legacy feed batches trade prints (roughly every 125 ms in the 2025 manual) and republishes the full best five whenever any of them changes. TAIFEX also publishes a separate **continuous (逐筆) market data feed** with its own manual. There, the book is maintained **incrementally** with I081 updates, and snapshot messages let you (re)build state.

### Prices need I010

TAIFEX prices on the wire are integers. The number of decimal places comes from the product's **decimal locator** in I010. That has two consequences:

- You **must** process I010 before you can interpret any quote correctly.
- Keep prices as scaled integers internally. Don't convert to floating point on the hot path.

### Building the book from incremental updates

With an incremental feed, your book is only as good as your sequence handling:

1. Load reference data (I010) and initialize an empty book per product.
2. Apply each update in sequence order: insert, change or delete at a price level.
3. On a **gap** in `INFORMATION-SEQ`, mark the affected books stale, then recover from a snapshot or the recovery service before you trust them again.
4. Cross-check: when an I020 trade print arrives, the book should be consistent with it.

In an FPGA, this is a classic design: a per-product book in BRAM, an update pipeline keyed by product index, and a sequence checker that raises a "stale" flag the strategy logic must respect.

## Part 2: TMP, the TAIFEX Message Protocol

### Binary, fixed-length, over TCP

TMP is not tag=value. Every message is a **fixed-length binary struct** with a common header and a type-specific body. Fields are fixed-width integers and character arrays, so a message is just a memory layout:

- No parsing: compare the message type and cast, or in hardware, decode fields at fixed byte offsets.
- No ambiguity: lengths are known up front, and a trailing checksum guards integrity.
- Very small messages compared to FIX, which matters for wire latency and for serialization cost.

The common header carries the message length, a per-session sequence number, a timestamp, the **message type**, and the identity of the sender: the **FCM** (futures commission merchant, 期貨商) ID and the session ID.

### Two families: L for link, R for request and report

TMP splits its messages into a **session layer** and an **application layer**:

**L-series (session):**

| Msg | Purpose |
|---|---|
| L10 | Wake-up / start of the session handshake |
| L20 | Wake-up confirmation |
| L30 | Logon notice from TAIFEX |
| L40… | Further logon steps, ending with a ready state |
| L-series heartbeat | Keep-alive while idle |

The handshake is a multi-step exchange. TAIFEX sends challenge-style information, and the FCM answers with credentials derived from its session password. Only after the final step may orders flow. Heartbeats keep the link alive, and a missed heartbeat ends the session.

**R-series (application):**

| Msg | Direction | Purpose |
|---|---|---|
| **R01** | FCM → TAIFEX | Order input: new, cancel, change price, reduce quantity, query |
| **R02** | TAIFEX → FCM | Execution report: acknowledgements and fills |
| **R03** | TAIFEX → FCM | Error report |
| **R31 / R32** | | Variants of the order and report messages for the alternative product-ID format |

One detail worth noting: **R01 is a single message for all order actions.** A field inside the message says whether it's a new order, a cancel or a modification. That's simpler than FIX's separate `D`/`F`/`G` messages.

### What's inside an order

An R01 carries the information you'd expect from any futures order, each as a fixed-width field:

- **Product ID**, in either the numeric or the text product-ID format, depending on symbol type (hence the R01/R31 split).
- **Price** and **quantity**: integers, using the product's decimal convention.
- **Side**: buy or sell.
- **Order type**: market, limit, or market-with-protection (範圍市價).
- **Time in force**: ROD, IOC or FOK.
- **Position effect** (開平倉碼): open, close, day trade, or let the exchange decide.
- **Investor account and flags**, the FCM's **order number**, and a **user-defined field** you can use to correlate reports back to your own state.

R02 reports echo the order identity and add the exchange status: accepted, filled (with price and quantity), cancelled, plus remaining quantity. R03 tells you why something was rejected.

### Practical notes

- **Mind the byte order and padding.** Fixed-layout protocols punish an off-by-one. Build a byte-for-byte test vector for every message type from the spec before going live.
- **Persist sequence numbers.** After a reconnect you'll need them to recover reports you missed. Don't assume a fresh start.
- **Respect flow control.** TAIFEX enforces per-session throughput limits. Rate-limit in your gateway.
- **Track the spec version.** TMP changes frequently, adding products, fields and status codes. Version-gate your structs.

## FIX vs TMP: when to use which

| | FIX | TMP |
|---|---|---|
| Encoding | Text, tag=value | Binary, fixed-length |
| Parsing cost | Tokenize, then look up tags | Field at a fixed offset |
| Message size | Larger | Compact |
| Tooling | Generic FIX engines work | Custom code required |
| Typical user | Multi-venue OMS | Latency-sensitive, TAIFEX-focused systems |

If you're building a hardware-accelerated futures system in Taiwan, TMP plus the continuous quote feed is the natural pairing. Both are fixed-layout and binary-friendly, and both map cleanly to a pipeline of byte-offset field extractors.

## References

- TAIFEX, *TCP/IP TMP Messaging Specifications* (English, v2.13.0): [taifex.com.tw](https://www.taifex.com.tw/file/taifex/eng/eng11/TechDocs/6/Taifex_TCPIP_TMP_v2.13.0.pdf)
- TAIFEX, *TCP/IP TMP 電文規範* (Chinese, v2.18.8, 2026/03/18), the latest: [taifex.com.tw](https://www.taifex.com.tw/file/taifex/CHINESE/11/TechDocs/4/%E6%9C%9F%E4%BA%A4%E6%89%80TCPIP_TMP_v2.18.8.pdf)
- TAIFEX, *資訊傳輸作業手冊 (行情資訊傳輸網路)* v2.31.0, the quote feed: [taifex.com.tw](https://www.taifex.com.tw/file/taifex/CHINESE/11/TechDocs/66/%E8%B3%87%E8%A8%8A%E5%82%B3%E8%BC%B8%E4%BD%9C%E6%A5%AD%E6%89%8B%E5%86%8A(V2.31.0).pdf)
- TAIFEX, *逐筆行情資訊傳輸作業手冊* v1.11.0, the continuous quote feed: [taifex.com.tw](https://www.taifex.com.tw/file/taifex/CHINESE/11/TechDocs/67/%E9%80%90%E7%AD%86%E8%A1%8C%E6%83%85%E8%B3%87%E8%A8%8A%E5%82%B3%E8%BC%B8%E4%BD%9C%E6%A5%AD%E6%89%8B%E5%86%8A(V1.11.0).pdf)
