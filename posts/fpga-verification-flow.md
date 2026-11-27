---
title: "An FPGA Verification Flow That Actually Catches Bugs"
date: 2026-11-27
type: tech
summary: "A practical, end-to-end FPGA verification flow: planning, lint and CDC, UVM simulation with a golden model, assertions and formal, regression, and finally hardware-in-the-loop testing on the board."
---

In the [FPGA HFT system post](/posts/fpga-hft-system) I claimed that verification takes more effort than design. This post explains where that effort goes. It walks through a verification flow I'd recommend for any serious FPGA project, from the first spec review to the board in the lab.

The FPGA mindset of "just reprogram it" is a trap. An FPGA can be patched in minutes, but a bug that reaches production, whether it sends wrong orders, corrupts packets or hangs a link, costs far more than the time saved by skipping verification. Treat an FPGA like an ASIC that happens to be cheap to respin.

## The flow at a glance

```
 spec ─► verification plan
            │
            ▼
 RTL ─► lint ─► CDC/RDC ─► unit sim ─► UVM sim ─► formal ─► regression
                                                               │
                                                               ▼
                synthesis ─► STA ─► post-synth/timing sim ─► hardware-in-the-loop
                                                               │
                                                               ▼
                                                           sign-off
```

Each stage catches a different class of bug, as cheaply as possible. Static checks find structural mistakes in seconds. Simulation finds functional bugs in minutes. Formal proves properties that simulation can only sample. The hardware finds what everything else missed.

## 1. Start with a verification plan

Before writing any testbench code, write down **what "correct" means** and how you'll show it:

- **Features**, taken from the spec: every message type, every mode, every error path.
- **For each feature**, the checking method (scoreboard, assertion or formal property) and the **coverage** that proves it was exercised.
- **Corner cases** you already know are dangerous: back-to-back packets, maximum-length frames, sequence gaps, resets mid-transaction, counters wrapping.

The plan becomes your measure of progress. "Done" means every item is covered and checked, not "the tests pass".

## 2. Static checks: lint, CDC and RDC

These run in seconds to minutes and need no testbench, so run them on every commit.

- **Lint** catches width mismatches, unintended latches, incomplete case statements, multiple drivers and simulation/synthesis mismatches. Agree on a rule set for the team and keep the waiver list short.
- **CDC (clock domain crossing)** analysis finds signals that cross clock domains without proper synchronization. FPGAs are full of clock domains (transceiver recovered clocks, user clocks, PCIe clocks) and CDC bugs are the worst kind: rare, timing-dependent and nearly impossible to reproduce in simulation.
- **RDC (reset domain crossing)** does the same for resets: an asynchronous reset in one domain corrupting state in another.

Rule of thumb: **every CDC violation is real until proven otherwise.**

## 3. Unit-level simulation

Before building a full environment, test each block with a small, directed testbench: the parser, the FIFO, the arbiter, the checksum. These tests are quick to write and quick to debug. They catch the obvious bugs before they get buried inside a large system simulation where they're much harder to find.

## 4. UVM simulation with a golden model

For the full design, or a large subsystem, build a **UVM** environment:

```
              ┌──────────── UVM env ─────────────┐
 sequences ─► │ driver ─► DUT ─► monitor ─┐      │
              │   │                       ▼      │
              │   └─► monitor ─► ref model ─► scoreboard
              │                                  │
              │          functional coverage     │
              └──────────────────────────────────┘
```

- **Agents** (driver, monitor, sequencer) per interface: AXI-Stream in, AXI-Stream out, register bus, and so on.
- **Constrained-random sequences** generate traffic within legal bounds, plus deliberately illegal traffic for the error paths.
- **A reference (golden) model** computes the expected output. For complex logic, write it in C++ and call it from SystemVerilog through **DPI-C**. The same model can then be reused for post-silicon checks and by the software team.
- **A scoreboard** compares the DUT's output against the model, transaction by transaction.
- **Functional coverage** (covergroups) measures whether the interesting scenarios actually happened.

Calling a C++ model through DPI-C looks like this:

```systemverilog
import "DPI-C" function void model_push(input byte unsigned data[], input int len);
import "DPI-C" function int  model_pop (output byte unsigned data[]);

class pkt_scoreboard extends uvm_scoreboard;
  `uvm_component_utils(pkt_scoreboard)
  uvm_analysis_imp #(pkt_item, pkt_scoreboard) dut_out;

  function void write(pkt_item got);
    byte unsigned exp[];
    int len;
    exp = new[2048];
    len = model_pop(exp);
    if (len != got.data.size() || !compare(exp, got.data, len))
      `uvm_error("SB", $sformatf("Mismatch on packet %0d", got.id))
  endfunction
  // ...
endclass
```

### Coverage closure

Code coverage (line, branch, toggle, FSM) tells you what RTL was **executed**. Functional coverage tells you what **scenarios** happened. You need both:

- High code coverage with low functional coverage means you ran a lot of code but not the interesting cases.
- High functional coverage with holes in code coverage often points to dead logic, or a missing item in the plan.

Close coverage by adding constraints and directed sequences, never by deleting coverpoints.

## 5. Assertions and formal verification

**SystemVerilog Assertions (SVA)** state rules that must always hold, and check them continuously in simulation:

```systemverilog
// A valid beat must stay stable until it is accepted
property p_stable_until_ready;
  @(posedge clk) disable iff (!rst_n)
    (tvalid && !tready) |=> (tvalid && $stable(tdata));
endproperty
assert property (p_stable_until_ready);

// Risk check: no order may exceed the configured maximum quantity
assert property (@(posedge clk) disable iff (!rst_n)
  order_valid |-> (order_qty <= max_qty));
```

**Formal verification** takes the same properties and *proves* them for all possible inputs, instead of sampling with random tests. It shines on:

- **Control logic and safety properties**: arbiters, FIFOs, handshakes, and anything where "never" really has to mean never, such as risk checks and kill switches.
- **Deep corner cases** that random simulation statistically never reaches.
- **Equivalence checking**: proving that the synthesized netlist matches the RTL, or that an optimized version of a block behaves exactly like the original.

Formal doesn't replace simulation for data-heavy paths like full packet processing, but on control logic it finds bugs simulation would never hit.

## 6. Regression and CI

Verification only works if it keeps running:

- **Nightly regressions** run every test with many random seeds. Each failure is logged with its seed so it can be reproduced exactly.
- **CI on every merge** runs lint, CDC and a fast "smoke" subset of tests.
- **Track the trends**: pass rate, coverage and bug discovery rate over time. When new bugs stop appearing *and* coverage is closed, you're approaching sign-off.

## 7. After synthesis: timing and netlist checks

- **Static timing analysis (STA)** must pass with real constraints. Unconstrained paths and false-path exceptions deserve as much review as RTL changes. A wrong `set_false_path` is a CDC bug in disguise.
- **Post-synthesis or timing simulation** of key scenarios catches simulation/synthesis mismatches, such as uninitialized registers or `X` propagation hidden by RTL simulation semantics.
- Review the **synthesis reports**: unexpected latches, removed logic (often a sign of a wiring bug) and resource usage.

## 8. Hardware-in-the-loop

Finally, the design runs on the real board, and new classes of bugs appear: board-level timing, transceiver behavior, real traffic patterns and long-running effects.

- **Bring-up tests**: link up, loopback, register access, memory tests.
- **Embedded logic analyzers** (an ILA, Xilinx's Integrated Logic Analyzer) let you capture internal signals on a trigger. Plan the debug probes early, because adding them later means another build.
- **Replay real traffic**: play captured network traffic (pcap files) into the board at line rate. Capture the outputs and compare them against the same golden model used in simulation. Reusing one model end to end is the payoff for building it carefully.
- **Soak tests**: run for hours or days at full rate. Counter overflows, memory leaks in the host software and rare CDC events only show up with time.
- **Error injection**: corrupted frames, dropped packets, link flaps and resets mid-stream.

## 9. Sign-off checklist

Before a build goes to production:

- [ ] Verification plan items all covered and checked
- [ ] Code and functional coverage closed, with holes reviewed and waived explicitly
- [ ] Lint, CDC and RDC clean, with every waiver reviewed
- [ ] All formal properties proven, or bounded proofs justified
- [ ] Regression passing across many seeds
- [ ] STA clean with reviewed constraints and exceptions
- [ ] Hardware replay and soak tests passing
- [ ] Bitstream, constraints and testbench versions tagged together in source control

## Closing thoughts

Good FPGA verification is layered: cheap static checks first, then simulation against an independent model, then formal for what must never fail, and finally real hardware with real traffic. Each layer catches what the previous one can't. Skipping any of them doesn't remove those bugs. It just means you find them later, at a much higher price.
