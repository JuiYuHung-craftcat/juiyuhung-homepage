import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";

const inter = Roboto_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JuiYuHung-Homepage",
  description: "JuiYuHung's homepage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="bg-blue_darkest_variation text-blue_lightest_variation"
    >
      <body className={inter.className}>{children}</body>
    </html>
  );
}
