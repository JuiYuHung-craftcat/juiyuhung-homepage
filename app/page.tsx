"use client"; // This is client component
import Image from "next/image";
import { useState, useEffect } from "react";

const Resume = () => {
  const [hydrated, setHydrated] = useState(false);
  const [tenure, setTenure] = useState<string>("{Loading Calculator}");

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      const interval = setInterval(() => {
        setTenure(
          (
            Date.now() / (1000 * 60 * 60 * 24 * 365) -
            (2015 - 1970 + 10 / 12)
          ).toFixed(8),
        );
      }, 10);
      return () => clearInterval(interval);
    }
  }, [tenure, hydrated]);

  return (
    <section className="pt-24 pb-12 px-4 mx-auto max-w-3xl">
      <div className="flex md:justify-between justify-evenly items-center animate-fade-in">
        <div className="space-y-1">
          <p className="md:text-xl text-lg font-semibold hover:text-terminal_green transition-colors duration-300">Jui-Yu Hung</p>
          <p className="md:text-lg text-base hover:text-terminal_green transition-colors duration-300">Mail: hi@juiyuhung.com</p>
        </div>
        <div className="hover:rotate-1 hover:scale-105 transition-transform duration-300 md:block hidden rounded-full overflow-hidden border-2 border-transparent hover:border-terminal_green">
          <Image
            src="/avatar/avatar.jpg"
            alt="JuiYuHung-Avatar"
            width="190"
            height="190"
          />
        </div>
        <div className="hover:rotate-1 hover:scale-105 transition-transform duration-300 md:hidden rounded-full overflow-hidden border-2 border-transparent hover:border-terminal_green">
          <Image
            src="/avatar/avatar.jpg"
            alt="JuiYuHung-Avatar"
            width="120"
            height="120"
          />
        </div>
      </div>
      <div className="pt-8 animate-slide-up">
        <h2 className="text-xl md:text-left text-center font-bold tracking-wide">ABOUT ME</h2>
        <hr className="border-terminal_green my-2 border-2" />
        <p className="leading-relaxed hover:text-terminal_green transition-colors duration-500">
          Digital IC design engineer with{" "}
          <span className="font-bold text-terminal_green animate-pulse">{tenure}</span> years of industry
          experience. The products include TDMA, LTE, NR modem, AI accelerator,
          high-speed IO(USB,HUB,DP,PCIe,Ethernet), TCP/IP protocol and HFT
          system. Skilled at low cost, low power and low latency design.
          Experienced in integration, front-end, middle-end and FPGA design flow.
          Capable of building design verification environment in SystemVerilog &
          UVM.
        </p>
      </div>
      <div className="pt-8 animate-slide-up">
        <h2 className="text-xl md:text-left text-center font-bold tracking-wide">EDUCATIONS</h2>
        <hr className="border-terminal_green my-2 border-2" />
        <div className="flex justify-between hover:bg-terminal_green/5 p-2 rounded transition-all duration-300">
          <p className="font-bold md:text-base text-sm">
            National Tsing-Hua University
          </p>
          <p className="md:text-base text-sm">Taiwan</p>
        </div>
        <div className="flex justify-between pt-4 hover:bg-terminal_green/5 p-2 rounded transition-all duration-300">
          <p className="font-bold md:block hidden">
            Master of Engineering in Department of Electrical Engineering
          </p>
          <p className="font-bold md:hidden block text-sm">Master in EE</p>
          <p className="font-bold md:text-base text-sm">Jul. 2015</p>
        </div>
        <ul className="list-disc pl-4 md:text-sm text-xs space-y-1">
          <li className="hover:text-terminal_green transition-colors duration-300">Expertise field: memory integrated circuit designs</li>
          <li className="hover:text-terminal_green transition-colors duration-300">Major in High-Speed Memory Sense Amplifier design</li>
          <li className="hover:text-terminal_green transition-colors duration-300">
            Conducted Projects of SRAM, NV-TCAM, RRAM, NAND-Flash, 3D-TSV.
          </li>
        </ul>
        <div className="flex justify-between pt-4 hover:bg-terminal_green/5 p-2 rounded transition-all duration-300">
          <p className="font-bold md:block hidden">
            Bachelor of Engineering in Department of Electrical Engineering
          </p>
          <p className="font-bold md:hidden block text-sm">Bechelor in EE</p>
          <p className="font-bold md:text-base text-sm">Jun. 2013</p>
        </div>
        <ul className="list-disc pl-4 md:text-sm text-xs space-y-1">
          <li className="hover:text-terminal_green transition-colors duration-300">Graduating in the honor of the top-rated prize</li>
        </ul>
      </div>
      <div className="pt-8 animate-slide-up">
        <h2 className="text-xl md:text-left text-center font-bold tracking-wide">EMPLOYMENT</h2>
        <hr className="border-terminal_green my-2 border-2" />
        <div className="flex justify-between hover:bg-terminal_green/5 p-3 rounded-lg transition-all duration-300 hover:scale-[1.02] border-l-2 border-transparent hover:border-terminal_green">
          <div>
            <p className="font-bold md:text-base text-sm">
              VICI Holdings, Taiwan
            </p>
            <p className="md:text-base text-sm">HFT Digital Design Engineer</p>
          </div>
          <p className="font-bold md:text-base text-sm">Dec.2024-NOW</p>
        </div>
        <div className="flex justify-between pt-4 hover:bg-terminal_green/5 p-3 rounded-lg transition-all duration-300 hover:scale-[1.02] border-l-2 border-transparent hover:border-terminal_green">
          <div>
            <p className="font-bold md:text-base text-sm">Algoltek, Taiwan</p>
            <p className="md:text-base text-sm">ASIC Design Engineer</p>
          </div>
          <p className="font-bold md:text-base text-sm">Apr.2022-Dec.2024</p>
        </div>
        <div className="flex justify-between pt-4 hover:bg-terminal_green/5 p-3 rounded-lg transition-all duration-300 hover:scale-[1.02] border-l-2 border-transparent hover:border-terminal_green">
          <div>
            <p className="font-bold md:text-base text-sm">MemryX, Taiwan</p>
            <p className="md:text-base text-sm">ASIC Design Engineer</p>
          </div>
          <p className="font-bold md:text-base text-sm">Sep.2020-Apr.2022</p>
        </div>
        <div className="flex justify-between pt-4 hover:bg-terminal_green/5 p-3 rounded-lg transition-all duration-300 hover:scale-[1.02] border-l-2 border-transparent hover:border-terminal_green">
          <div>
            <p className="font-bold md:text-base text-sm">Mediatek, Taiwan</p>
            <p className="md:text-base text-sm">ASIC Design Engineer</p>
          </div>
          <p className="font-bold md:text-base text-sm">Nov.2015-Sep.2020</p>
        </div>
      </div>
      <div className="pt-8 animate-slide-up">
        <h2 className="text-xl md:text-left text-center font-bold tracking-wide">SKILLS</h2>
        <hr className="border-terminal_green my-2 border-2" />
        <ul className="md:text-base text-sm space-y-4">
          <li className="hover:bg-terminal_green/5 p-3 rounded-lg transition-all duration-300">
            <span className="font-bold text-terminal_green">Programming language:</span>
            <br /> Verilog-2005, SystemVerilog, Tcl, C/C++, Perl, Lua, Rust,
            Javascript, Typescript, SQL
          </li>
          <li className="hover:bg-terminal_green/5 p-3 rounded-lg transition-all duration-300">
            <span className="font-bold text-terminal_green">Tools:</span>
            <br /> VCS, Xrun, Verdi, Simvision, DC, Genus, VC Formal, LEC, STA,
            SG-lint, SG-cdc, PTPX, Power-Artist, Vivado
          </li>
          <li className="hover:bg-terminal_green/5 p-3 rounded-lg transition-all duration-300">
            <span className="font-bold text-terminal_green">Frameworks:</span>
            <br /> UVM
          </li>
        </ul>
      </div>

      <div className="pt-8 animate-slide-up">
        <h2 className="text-xl md:text-left text-center font-bold tracking-wide">
          PATENTS AND PUBLICATIONS
        </h2>
        <hr className="border-terminal_green my-2 border-2" />
        <p className="font-bold text-terminal_green">Published Papers:</p>
        <ul className="list-disc pl-4 md:text-base text-sm space-y-2">
          <li className="pt-2 hover:text-terminal_green transition-colors duration-300">
            “A 256b-wordlength ReRAM-based TCAM with 1ns search-time and 14x
            improvement in wordlength-energyefficiency-density product using
            2.5T1R cell ”
            <span className="font-bold italic">
              IEEE International Solid-State Circuits Conference (ISSCC)
            </span>
            , Feb 2016.
          </li>
          <li className="pt-2">
            “Alow-powersubthreshold-to-superthresholdlevel-shifterforsub-0.5VembeddedresistiveRAM
            (ReRAM) macro in ultra low-voltage chips”
            <span className="font-bold italic">
              IEEE Asia Pacific Conference on Circuit and Systems(APCCAS)
            </span>
            , Nov. 2014.
          </li>
        </ul>
        <p className="font-bold pt-4 text-terminal_green">Patents:</p>
        <ul className="list-disc pl-4 md:text-base text-sm">
          <li className="pt-2 hover:text-terminal_green transition-colors duration-300">
            “Sense Amplifier”, United States Patent US 9378780 B1 Active Jun.,
            2015
          </li>
        </ul>
      </div>
      <div className="pt-8 animate-slide-up">
        <h2 className="text-xl md:text-left text-center font-bold tracking-wide">SIDE PROJECTS</h2>
        <hr className="border-terminal_green my-2 border-2" />
        <div className="hover:bg-terminal_green/5 p-4 rounded-lg transition-all duration-300 border-l-4 border-transparent hover:border-terminal_green">
          <p className="font-bold text-terminal_green text-lg">Crypto AI Trading System:</p>
          <ul className="list-disc pl-4 md:text-base text-sm space-y-2 mt-2">
            <li className="hover:translate-x-1 transition-transform duration-300">Language: Python, Typescript</li>
            <li className="hover:translate-x-1 transition-transform duration-300">
              Description: AI-powered cryptocurrency trading system with automated
              strategy execution and real-time market analysis. Using Pytorch to train
              model and do backtesting. Using Node.js to do live trading.
            </li>
            <li className="hover:translate-x-1 transition-transform duration-300">Features: Reinforcement Learning, Backtesting, ONNX</li>
            <li className="hover:translate-x-1 transition-transform duration-300">
              Project Status:{" "}
              <span className="text-black bg-terminal_green px-2 py-1 rounded animate-pulse">Active</span>
            </li>
            <li className="hover:translate-x-1 transition-transform duration-300">
              Interim results:
            </li>
          </ul>
          <div className="pt-4 rounded-lg overflow-hidden">
            <Image
              src="/page/results.png"
              alt="Crypto AI Trading Results"
              width="800"
              height="600"
              className="w-full h-auto invert hover:scale-[1.02] transition-transform duration-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Resume;
