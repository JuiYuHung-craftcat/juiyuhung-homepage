"use client";

import { usePathname } from "next/navigation";

export const Header = () => {
  const pathname = usePathname();
  const resumeCurrent = pathname == "/";
  return (
    <header className="fixed w-full p-2 z-20 backdrop-blur-md">
      <div className="mx-auto max-w-3xl">
        <nav className="flex items-center md:gap-12 gap-6 text-base">
          <a href="/" className="group">
            <h2 className="font-semibold tracking-tighter p-2 font-mplus text-xl">
              [JuiYuHung]$
            </h2>
          </a>
          <div className="items-center md:gap-6 gap-3 flex md:text-xl text-base">
            <a
              className={
                "hover:underline decoration-2 " +
                (resumeCurrent ? "text-black bg-terminal_green" : "")
              }
              href="/"
            >
              RESUME
            </a>
            <a
              className="hover:underline decoration-2"
              href="https://github.com/JuiYuHung-craftcat"
            >
              GITHUB
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
};
