import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "ShadowDrop — Confidential Distribution OS",
  description: "Create confidential tokens and encrypted TokenOps airdrops on Zama.",
  icons: { icon: "/icon.svg", apple: "/apple-icon.svg" },
};
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Providers>{children}</Providers></body></html>; }
