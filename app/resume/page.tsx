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
      <div className="flex md:justify-between justify-evenly items-center">
        <div>
          <p className="md:text-xl text-lg">Jui-Yu Hung</p>
          <p className="md:text-lg text-base">Mail: hi@juiyuhung.com</p>
          <p className="md:text-lg text-base">Phone: +886-975253061</p>
        </div>
        <div className="hover:rotate-1 md:block hidden">
          <Image
            src="/avatar/avatar.jpg"
            alt="JuiYuHung-Avatar"
            width="190"
            height="190"
          />
        </div>
        <div className="hover:rotate-1 md:hidden">
          <Image
            src="/avatar/avatar.jpg"
            alt="JuiYuHung-Avatar"
            width="120"
            height="120"
          />
        </div>
      </div>
      <div className="pt-8">
        <h2 className="text-xl md:text-left text-center">ABOUT ME</h2>
        <hr className="border-terminal_green my-2" />
        <p>
          Digital IC design engineer with{" "}
          <span className="font-bold">{tenure}</span> years of industry
          experience. The products include TDMA, LTE, NR modem, AI accelerator
          and high-speed IO(USB,HUB,DP). Skilled at low cost and low power IP
          design. Experienced in integration, front-end and middle-end design
          flow. Capable of building design verification environment in
          SystemVerilog & UVM.
        </p>
      </div>
      <div className="pt-8">
        <h2 className="text-xl md:text-left text-center">EDUCATIONS</h2>
        <hr className="border-terminal_green my-2" />
        <div className="flex justify-between">
          <p className="font-bold md:text-base text-sm">
            National Tsing-Hua University
          </p>
          <p className="md:text-base text-sm">Taiwan</p>
        </div>
        <div className="flex justify-between pt-4">
          <p className="font-bold md:block hidden">
            Master of Engineering in Department of Electrical Engineering
          </p>
          <p className="font-bold md:hidden block text-sm">Master in EE</p>
          <p className="font-bold md:text-base text-sm">Jul. 2015</p>
        </div>
        <ul className="list-disc pl-4 md:text-sm text-xs">
          <li>Expertise field: memory integrated circuit designs</li>
          <li>Major in High-Speed Memory Sense Amplifier design</li>
          <li>
            Conducted Projects of SRAM, NV-TCAM, RRAM, NAND-Flash, 3D-TSV.
          </li>
        </ul>
        <div className="flex justify-between pt-4">
          <p className="font-bold md:block hidden">
            Bachelor of Engineering in Department of Electrical Engineering
          </p>
          <p className="font-bold md:hidden block text-sm">Bechelor in EE</p>
          <p className="font-bold md:text-base text-sm">Jun. 2013</p>
        </div>
        <ul className="list-disc pl-4 md:text-sm text-xs">
          <li>Graduating in the honor of the top-rated prize</li>
          <li>
            Honorary membership of the phi tau phi scholastic honor society
          </li>
        </ul>
      </div>
      <div className="pt-8">
        <h2 className="text-xl md:text-left text-center">EMPLOYMENT</h2>
        <hr className="border-terminal_green my-2" />
        <div className="flex justify-between">
          <div>
            <p className="font-bold md:text-base text-sm">Algoltek, Taiwan</p>
            <p className="md:text-base text-sm">ASIC Design Engineer</p>
          </div>
          <p className="font-bold md:text-base text-sm">Apr.2022-NOW</p>
        </div>
        <div className="flex justify-between pt-4">
          <div>
            <p className="font-bold md:text-base text-sm">MemryX, Taiwan</p>
            <p className="md:text-base text-sm">ASIC Design Engineer</p>
          </div>
          <p className="font-bold md:text-base text-sm">Sep.2020-Apr.2022</p>
        </div>
        <div className="flex justify-between pt-4">
          <div>
            <p className="font-bold md:text-base text-sm">Mediatek, Taiwan</p>
            <p className="md:text-base text-sm">ASIC Design Engineer</p>
          </div>
          <p className="font-bold md:text-base text-sm">Nov.2015-Sep.2020</p>
        </div>
      </div>
      <div className="pt-8">
        <h2 className="text-xl md:text-left text-center">SKILLS</h2>
        <hr className="border-terminal_green my-2" />
        <ul className="md:text-base text-sm">
          <li>
            <span className="font-bold">Programming language:</span>
            <br /> Verilog-2005, SystemVerilog, Tcl, C/C++, Perl, Lua, Rust,
            Javascript, Typescript, SQL
          </li>
          <li className="pt-4">
            <span className="font-bold">Tools:</span>
            <br /> VCS, Xrun, Verdi, Simvision, DC, Genus, VC Formal, LEC, STA,
            SG-lint, SG-cdc, PTPX, Power-Artist
          </li>
          <li className="pt-4">
            <span className="font-bold">Frameworks:</span>
            <br /> UVM
          </li>
        </ul>
      </div>

      <div className="pt-8">
        <h2 className="text-xl md:text-left text-center">
          PATENTS AND PUBLICATIONS
        </h2>
        <hr className="border-terminal_green my-2" />
        <p className="font-bold">Published Papers:</p>
        <ul className="list-disc pl-4 md:text-base text-sm">
          <li className="pt-2">
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
        <p className="font-bold pt-4">Patents:</p>
        <ul className="list-disc pl-4 md:text-base text-sm">
          <li className="pt-2">
            “Sense Amplifier”, United States Patent US 9378780 B1 Active Jun.,
            2015
          </li>
        </ul>
      </div>
      <div className="pt-8">
        <h2 className="text-xl md:text-left text-center">SIDE PROJECTS</h2>
        <hr className="border-terminal_green my-2" />
        <p className="font-bold">Register Abstration Layer Auto-Generator:</p>
        <ul className="list-disc pl-4 md:text-base text-sm">
          <li>Language: Javascript</li>
          <li>
            Description: User maintain an xlsx file and the tool will generate
            all needed files
          </li>
          <li>Input: Register information in xlsx format</li>
          <li>
            Output: Docx, html, json, rtl, header file, verification pattern
          </li>
          <li>
            Project Status:{" "}
            <span className="text-black bg-terminal_green">Released</span>
          </li>
        </ul>
        <p className="font-bold pt-4">Design Environment Generator:</p>
        <ul className="list-disc pl-4 md:text-base text-sm">
          <li>Language: Rust</li>
          <li>
            Description: Auto-generate ASIC design environment with executing
            command, tcls of tools, common ip and common verification blocks
          </li>
          <li>
            Support Tools: VCS, SpyGlass(lint, CDC), Design Compiler, Formality,
            Static-Analysis
          </li>
          <li>
            Project Status:{" "}
            <span className="text-black bg-yellow-600"> Alpha Test </span>
          </li>
        </ul>
        <p className="font-bold pt-4">SystemVerilog Editor</p>
        <ul className="list-disc pl-4 md:text-base text-sm">
          <li>Language: Rust</li>
          <li>
            Description: A SystemVerilog text editor that supports syntax
            highlight, auto-correct, definition trace, declaration trace and
            auto complete
          </li>
          <li>
            Module Structure: A front-end text editor, a language server
            protocol and a back-end language server that includes tree-sitter
            and analyser
          </li>
          <li>
            Project Status:{" "}
            <span className="text-black bg-red-600">Developing</span>
          </li>
        </ul>
      </div>
    </section>
  );
};

export default Resume;
