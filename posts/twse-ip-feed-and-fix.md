---
title: "TWSE Connectivity 101: the IP Quote Feed and the FIX Order Gateway"
date: 2026-11-26
type: trading
summary: "An introduction to the two pipes every Taiwan equities trading system needs: the TWSE IP market data feed (BCD-packed, XOR-checked records) and the FIX-based order entry interface with its TWSE-specific tags."
---

Every trading system on the Taiwan Stock Exchange (TWSE) talks to the exchange through two very different pipes:

1. **The IP quote feed** (IP 行情網路), which pushes market data *to* you.
2. **The FIX order gateway** (FIX 電文), which carries your orders *to* the exchange and execution reports back.

This post is a map of both: what the messages look like, how they're framed, and what to watch out for when you build a parser or gateway, in software or on an FPGA.

> The exchange revises these specs regularly. Treat this post as an orientation guide and the official documents (linked at the end) as the source of truth for byte offsets and code tables.

## Part 1: The IP quote feed

### Framing: one record, one format

The TWSE feed is a stream of fixed-layout binary records. Each record has the same envelope:

| Field | Size | Encoding | Notes |
|---|---|---|---|
| ESC-CODE | 1 byte | ASCII 27 (`0x1B`) | Start-of-record marker |
| Message length (訊息長度) | 2 bytes | Packed BCD | Length of the **whole** record, ESC through terminal code |
| Business type (業務別) | 1 byte | Packed BCD | `01` = TWSE listed market, `02` = TPEx (OTC) |
| Format code (傳輸格式代碼) | 1 byte | Packed BCD | Which message this is, e.g. `06` |
| Format version (傳輸格式版別) | 1 byte | Packed BCD | Versioned independently per format |
| Sequence number (傳輸序號) | 4 bytes | Packed BCD | Starts at 1 each day, **counted per format** |
| Body | varies | | Format-specific |
| Checksum (檢查碼) | 1 byte | XOR | XOR over the record content |
| TERMINAL-CODE | 2 bytes | `0x0D 0x0A` | End-of-record marker |

A few design choices stand out:

- **Packed BCD everywhere.** Each byte holds two decimal digits, so `0x12 0x34` reads as "1234". It's easy to eyeball in a hex dump and cheap to decode in hardware, since each nibble is a digit. But you can't do binary arithmetic on it directly.
- **Per-format sequence numbers.** Gap detection has to be tracked per `(business type, format code)` pair, not with one global counter.
- **A simple XOR checksum.** It's one XOR tree in hardware and a one-line loop in software.

### Which formats matter

The feed carries dozens of formats. Two of them show up in every trading system:

- **Format 1: stock basic information (個股基本資料).** Sent before the open. Reference price, limit-up and limit-down prices, the stock's name and various status flags. This is your static data for the day.
- **Format 6: real-time quotes for listed common stocks (集中市場普通股即時行情).** The hot path: last trade price and volume plus the best five bid and ask levels.

### Inside Format 6

Since TWSE moved to **continuous trading (逐筆交易)** in March 2020, Format 6 updates arrive per event instead of in periodic batch snapshots. Conceptually, a Format 6 body contains:

1. **Stock code**: 6 bytes, ASCII, space-padded (e.g. `2330  `).
2. **Match time (撮合時間)**: packed BCD, down to the microsecond.
3. **Display item flags (揭示項目註記)**: one bitmap byte saying what follows: whether a trade price and volume is included, and how many bid and ask levels (0 to 5) are present.
4. **Limit-up/down and status flags (漲跌停註記 / 狀態註記)**: whether the price is pinned at a limit, trial matching (試撮), and so on.
5. **Cumulative volume (累計成交數量)**.
6. **A variable number of price/volume pairs**: the trade (if flagged) followed by the bid levels and then the ask levels. Prices are packed BCD with implied decimals.

The key point for parser design is that **the body length is variable** and only the flag byte tells you how many pairs follow. Decode the bitmap first, then walk the pairs. In hardware, that bitmap drives a small state machine or a mux that steers each 9-byte price/volume slot to the right register.

### Decoding sketch

```c
// Packed BCD -> integer, e.g. {0x00,0x58,0x50,0x00,0x00} -> 585000000
static inline uint64_t bcd_to_u64(const uint8_t *p, int n) {
    uint64_t v = 0;
    for (int i = 0; i < n; i++)
        v = v * 100 + (p[i] >> 4) * 10 + (p[i] & 0x0F);
    return v;
}

// XOR checksum over the record content (check the spec for the exact range)
static inline uint8_t xor_sum(const uint8_t *p, int n) {
    uint8_t x = 0;
    while (n--) x ^= *p++;
    return x;
}
```

### Practical notes

- **Gaps and duplicates.** Keep a sequence tracker per format and use the exchange's recovery or retransmission service when you detect a hole. Drop duplicates by sequence number.
- **Resynchronize on ESC.** If you lose framing, scan forward for `0x1B`, read the length, and confirm that `0x0D 0x0A` sits where the length says it should before you trust the record.
- **Read the version byte.** When TWSE bumps a format version, field layouts can change. Reject or log versions you don't support instead of misparsing them.
- **TPEx is a sibling, not a twin.** The OTC market (business type `02`) uses the same envelope, but its format tables and lengths differ. Don't share a parser blindly.

## Part 2: Order entry over FIX

### Why FIX

For order entry, TWSE offers a **FIX-based interface** (FIX 4.4, which superseded an earlier FIX 4.2 flavor). Brokers connect over TCP with a standard FIX session layer: Logon `A`, Heartbeat `0`, TestRequest `1`, ResendRequest `2`, Reject `3`, SequenceReset `4` and Logout `5`. If you've built a FIX engine for any other venue, the session layer will feel familiar. The differences are in the application-level details.

### Application messages

| MsgType | Name | Direction | Purpose |
|---|---|---|---|
| `D` | NewOrderSingle | Broker → TWSE | New order |
| `F` | OrderCancelRequest | Broker → TWSE | Cancel |
| `G` | OrderCancelReplaceRequest | Broker → TWSE | Change price, or reduce quantity |
| `H` | OrderStatusRequest | Broker → TWSE | Query an order |
| `8` | ExecutionReport | TWSE → Broker | Acks, fills, cancels, rejects |
| `9` | OrderCancelReject | TWSE → Broker | A cancel or replace was refused |
| `j` | BusinessMessageReject | TWSE → Broker | Application-level reject |

### Standard tags, Taiwan semantics

A `NewOrderSingle` uses the familiar tags, each with local conventions:

- **Account (1)**: the investor's account number at the broker.
- **Symbol (55)**: the stock code, e.g. `2330`.
- **Side (54)**: buy or sell.
- **OrderQty (38)**: check the unit carefully. Board-lot and odd-lot orders are handled differently.
- **OrdType (40)**: market or limit.
- **TimeInForce (59)**: Taiwan traders say **ROD** (Rest of Day, FIX `0` = Day), **IOC** (`3`) and **FOK** (`4`).
- **ClOrdID (11)** and **OrderID (37)**: your client order ID, and the exchange-side order number (委託書編號) that ties the order to the broker's books.

### TWSE custom tags

TWSE adds user-defined tags in the 10000 range to carry information that has no standard FIX home:

| Tag | Name | Meaning |
|---|---|---|
| 10000 | `TwseIvacnoFlag` | Order channel: regular, ATM, DMA, internet, voice, API… |
| 10001 | `TwseOrdType` | Trade type: `0` = regular (cash), `1` = margin purchase, `2` = short sale, and further codes for other financing arrangements |
| 10002 | `TwseExCode` | Session/market: `0` = regular or fixed-price trading, `2` = odd lot |

These are the tags most likely to trip up a generic FIX engine. They're required, they're validated, and their code tables differ between versions and between TWSE and TPEx. TPEx reuses tag 10000 with different letter codes, for example.

### Practical notes

- **Sequence numbers are sacred.** Persist your inbound and outbound sequence numbers. A careless reset at reconnect turns into rejected logons or replayed orders.
- **Expect throttles.** The exchange enforces per-session rate limits. Pace orders in the gateway instead of relying on rejects to tell you you're too fast.
- **Odd lots are a separate world.** Since intraday odd-lot trading (盤中零股) launched, odd-lot orders flow through their own session type and code values. Keep them separate in your order model.
- **The latency budget lives in the parser.** FIX is text (`tag=value<SOH>`). For low-latency gateways, pre-build the static part of each message, and only patch price, quantity, ClOrdID, checksum and body length on the hot path.

## Putting it together

A minimal TWSE trading stack looks like this:

```
IP multicast ──► frame/BCD decode ──► per-format seq check ──► book/last-trade state
                                                                     │
                                                              strategy logic
                                                                     │
FIX gateway ◄── session layer (seq, heartbeat) ◄── order builder ◄───┘
     │
     └──► ExecutionReport (8) ──► position & risk
```

The quote side is a binary, BCD-packed, broadcast stream that rewards careful framing and gap handling. The order side is plain FIX with Taiwan-specific tags and session rules. Get both right and you have the foundation for anything from a simple algo to a hardware-accelerated market maker.

## References

- TWSE, *資訊傳輸作業手冊 (IP 行情網路)*, the IP market data specification: [twse.com.tw](https://www.twse.com.tw/staticFiles/product/broker/ff80808166388ea1016676ac085501de.pdf)
- TWSE, *FIX 4.4 電文規範 作業手冊*, the FIX order entry specification: [twse.com.tw](https://www.twse.com.tw/staticFiles/product/broker/b002000176.doc)
- TPEx, *上櫃股票 IP 行情網路規格書*, the OTC market equivalent: [tpex.org.tw](https://www.tpex.org.tw/storage/eb_data/11209/1120500723-1.pdf)
