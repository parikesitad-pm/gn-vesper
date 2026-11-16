"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Language, Theme } from "@/lib/intent/types";
import "./docs.css";

const copy = {
  en: {
    title: "Use Vesper.", intro: "One line becomes a page action or an answer about dap_, with public sources.", back: "Back to Vesper", skip: "Skip to documentation",
    sections: ["Open the island", "Run an action", "Ask a question", "Read the result", "Run your own copy", "Accessibility"],
    open: "Hover the icon or Wake Vesper to preview the island. Move away to return to the icon. Click either control, or press Ctrl+K / Command+K, to keep it open and type. Enter sends; Escape closes and restores focus.",
    act: "Use ACT in the playground or type into the island. Commands change this page: theme, language, motion, or section. Try one of these:",
    know: "Use KNOW or ask in the island. Vesper answers about its creator from d-ap.my.id. Try “Who created Vesper?” or “What are dap_'s skills?”. Each request stands alone; Vesper has no conversation history. Owl (GN-011) is a separate conversational assistant.",
    result: "Answered by shows the provider and model that actually answered. Local identity facts and public source excerpts are marked “no AI model”. Follow the source links to check a claim. The Observatory shows measured latency, provider attempts, and the validated action. If public information or a provider is unavailable, the result says so.",
    install: "Clone the repository and use Node.js 22.6 or later. Local ACT rules work without API keys. KNOW needs access to the public source; without model keys it returns a source excerpt. Optional provider keys stay on the server; follow the repository setup instructions to enable AI.",
    integrate: "To reuse Vesper, start from the repository. Adapt the action allow-list and execution adapter to your page, then update the public knowledge source. This showcase has no drop-in hosted embed. Keep validation before execution and credentials on the server.",
    api: "The existing app uses these same-origin POST endpoints. Send JSON with Content-Type: application/json. Inputs are limited to 200 characters. Handle 400 (invalid input), 429 (rate limit), and 502/503 (provider or source unavailable). A classifier response is data; validate it before running any action.",
    access: "All actions are available by keyboard and click. Tab moves between controls; arrow keys, Home and End switch ACT/KNOW tabs. Focus has a visible outline. Pause motion in the header; the system reduced-motion preference is respected. Use the skip link to jump to the command input. Theme controls are available below the console.",
    source: "Repository and setup", try: "Try the playground", theme: "Theme", language: "Switch to Indonesian",
  },
  id: {
    title: "Pakai Vesper.", intro: "Satu baris menjadi aksi halaman atau jawaban tentang dap_, dengan sumber publik.", back: "Kembali ke Vesper", skip: "Langsung ke dokumentasi",
    sections: ["Buka island", "Jalankan aksi", "Ajukan pertanyaan", "Baca hasilnya", "Jalankan salinan sendiri", "Aksesibilitas"],
    open: "Hover ikon atau Bangunkan Vesper untuk melihat island. Geser pointer keluar untuk kembali ke ikon. Klik salah satunya, atau tekan Ctrl+K / Command+K, agar tetap terbuka dan bisa mengetik. Enter mengirim; Escape menutup dan mengembalikan fokus.",
    act: "Pilih ACT di playground atau ketik di island. Perintah mengubah halaman ini: tema, bahasa, animasi, atau bagian halaman. Coba salah satu:",
    know: "Pilih KNOW atau bertanya di island. Vesper menjawab tentang pembuatnya dari d-ap.my.id. Coba “Siapa pembuat Vesper?” atau “Apa keahlian dap_?”. Setiap permintaan berdiri sendiri; tidak ada riwayat percakapan. Owl (GN-011) adalah asisten percakapan terpisah.",
    result: "Dijawab oleh menampilkan provider dan model yang benar-benar menjawab. Fakta identitas lokal dan kutipan sumber ditandai “tanpa model AI”. Buka tautan sumber untuk memeriksa klaim. Observatorium menampilkan latensi terukur, percobaan provider, dan aksi tervalidasi. Jika informasi publik atau provider tidak tersedia, hasil akan menjelaskannya.",
    install: "Clone repositori dan gunakan Node.js 22.6 atau lebih baru. Aturan ACT lokal berjalan tanpa API key. KNOW membutuhkan akses ke sumber publik; tanpa key model, hasilnya berupa kutipan sumber. Key provider opsional tetap di server; ikuti petunjuk setup repositori untuk mengaktifkan AI.",
    integrate: "Untuk memakai Vesper di proyekmu, mulai dari repositori. Sesuaikan daftar aksi yang diizinkan dan adapter eksekusi dengan halamanmu, lalu ubah sumber pengetahuan publik. Showcase ini belum menyediakan embed hosted siap tempel. Pertahankan validasi sebelum eksekusi dan simpan kredensial di server.",
    api: "Aplikasi memakai endpoint POST same-origin berikut. Kirim JSON dengan Content-Type: application/json. Input dibatasi 200 karakter. Tangani 400 (input tidak valid), 429 (batas permintaan), dan 502/503 (provider atau sumber tidak tersedia). Respons klasifikasi adalah data; validasi sebelum menjalankan aksi.",
    access: "Semua aksi tersedia lewat keyboard dan klik. Tab berpindah kontrol; tombol panah, Home, dan End berpindah tab ACT/KNOW. Fokus memiliki garis penanda. Jeda animasi lewat header; preferensi reduced motion sistem dihormati. Skip link langsung menuju input perintah. Kontrol tema ada di bawah konsol.",
    source: "Repositori dan setup", try: "Coba playground", theme: "Tema", language: "Switch to English",
  },
};
const ids = ["open", "act", "know", "results", "integration", "accessibility"];

export function Docs() {
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const t = copy[language];
  return <div className="docs wrap">
    <a className="docs-skip" href="#docs-main">{t.skip}</a>
    <header className="docs-header"><Link href="/">vesper / GN-013</Link><div><label>{t.theme}<select value={theme} onChange={e => setTheme(e.target.value as Theme)}><option value="dark">Dracula</option><option value="light">Light</option><option value="neon">Neon</option></select></label><button onClick={() => setLanguage(language === "en" ? "id" : "en")} aria-label={t.language}>{language.toUpperCase()} ↗</button></div></header>
    <main id="docs-main" tabIndex={-1}>
      <div className="docs-intro"><span>VESPER / DOCS</span><h1>{t.title}</h1><p>{t.intro}</p><Link href="/#playground">{t.try} →</Link></div>
      <nav aria-label={language === "id" ? "Isi dokumentasi" : "On this page"}>{t.sections.map((title, i) => <a key={ids[i]} href={`#${ids[i]}`}>{String(i + 1).padStart(2, "0")} / {title}</a>)}</nav>
      {t.sections.map((title, i) => <section key={ids[i]} id={ids[i]}><h2>{title}</h2>
        <p>{[t.open, t.act, t.know, t.result, t.install, t.access][i]}</p>
        {i === 1 && <ul>{(language === "id" ? ["Buat neon", "Ganti ke bahasa Inggris", "Jeda animasi", "Tampilkan arsitektur"] : ["Make it neon", "Switch to Indonesian", "Pause the motion", "Show the architecture"]).map(command => <li key={command}><code>{command}</code></li>)}</ul>}
        {i === 4 && <><pre><code>{"git clone https://github.com/parikesitad-pm/gn-vesper.git\ncd gn-vesper\nnpm install\nnpm run dev"}</code></pre><p><a href="https://github.com/parikesitad-pm/gn-vesper#readme">{t.source} ↗</a></p><p>{t.integrate}</p><p>{t.api}</p><dl><dt><code>POST /api/ask</code></dt><dd><code>{'{ "question": "Who created Vesper?" }'}</code><p>→ answer, sources, provider, model, latencyMs, attempts, retrieval, mode</p></dd><dt><code>POST /api/classify</code></dt><dd><code>{'{ "input": "Make it neon" }'}</code><p>→ raw, provider, model, latencyMs, attempts</p></dd></dl></>}
      </section>)}
    </main><footer><Link href="/">← {t.back}</Link><span>dap_ / Vesper GN-013</span></footer>
  </div>;
}
