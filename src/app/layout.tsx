import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = { title: "ShadowDrop — Confidential Distribution OS", description: "Private airdrops, vesting, payroll, grants and token operations on Zama." };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Providers>{children}</Providers></body></html>; }
