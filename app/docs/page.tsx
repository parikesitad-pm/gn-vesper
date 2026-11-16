import type { Metadata } from "next";
import { Docs } from "./Docs";

export const metadata: Metadata = { title: "Vesper docs — usage and integration", description: "Use Vesper's ACT and KNOW interface, inspect answers, and run your own local copy." };

export default function DocsPage() { return <Docs />; }
