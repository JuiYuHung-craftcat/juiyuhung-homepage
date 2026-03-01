"use client";

import { usePathname } from "next/navigation";

export const Header = () => {
  const pathname = usePathname();
  const resumeCurrent = pathname == "/";
  return (
    <header className="fixed w-full p-2 z-20 backdrop-blur-md">
      <div className="mx-auto max-w-3xl">
        <nav className="flex items-center justify-between md:gap-12 gap-6 text-base">
          <div className="flex items-center md:gap-12 gap-6">
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
          </div>
          <a 
            href="mailto:hi@juiyuhung.com"
            className="bg-terminal_green text-black px-4 py-2 rounded-lg hover:bg-terminal_green/80 transition-all duration-300 md:flex hidden items-center gap-2 font-semibold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            hi@juiyuhung.com
          </a>
        </nav>
      </div>
    </header>
  );
};
