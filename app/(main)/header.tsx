"use client";

import { usePathname } from "next/navigation";

export const Header = () => {
  const pathname = usePathname();
  const resumeCurrent = pathname == "/";
  const postsCurrent = pathname.startsWith("/posts");
  return (
    <header className="fixed w-full p-2 z-20 backdrop-blur-md">
      <div className="mx-auto max-w-3xl">
        <nav className="flex flex-wrap md:flex-nowrap items-center justify-between gap-y-1 md:gap-12 text-base">
          <a href="/" className="group order-1">
            <h2 className="font-semibold tracking-tighter p-2 font-mplus md:text-xl text-lg">
              [JuiYuHung]$
            </h2>
          </a>
          <div className="order-3 md:order-2 w-full md:w-auto md:mr-auto px-2 md:px-0 items-center md:gap-6 gap-5 flex md:text-xl text-base">
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
              className={
                "hover:underline decoration-2 " +
                (postsCurrent ? "text-black bg-terminal_green" : "")
              }
              href="/posts"
            >
              POSTS
            </a>
            <a
              className="hover:underline decoration-2"
              href="https://github.com/JuiYuHung-craftcat"
            >
              GITHUB
            </a>
          </div>
          <a
            href="mailto:hi@juiyuhung.com"
            className="order-2 md:order-3 bg-terminal_green text-black md:px-4 px-3 md:py-2 py-1.5 rounded-lg hover:bg-terminal_green/80 transition-colors duration-300 flex items-center gap-2 font-semibold md:text-base text-sm max-[359px]:text-xs max-[359px]:px-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 max-[359px]:hidden" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <span>hi@juiyuhung.com</span>
          </a>
        </nav>
      </div>
    </header>
  );
};
