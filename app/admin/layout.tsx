import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | JuiYuHung",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <section className="pt-24 pb-12 px-4 mx-auto max-w-5xl relative z-10">{children}</section>;
}
