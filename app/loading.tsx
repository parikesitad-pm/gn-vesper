import { VesperFace } from "@/components/atoms/VesperFace";

export default function Loading() {
  return <main className="vesper-loading" aria-busy="true" aria-label="Loading Vesper"><VesperFace state="think" size={48} /><p role="status">Loading Vesper…</p></main>;
}
