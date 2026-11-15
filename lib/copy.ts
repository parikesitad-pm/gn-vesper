/**
 * Page copy, in English and Indonesian. The notch itself is language-agnostic; this is what `language en|id`
 * switches. Keeping it in one typed table means a missing translation is a type error, not a blank label.
 */
import type { Destination, Language, Theme } from "./intent/types";

export const LANGS: { id: Language; label: string }[] = [
  { id: "en", label: "English" },
  { id: "id", label: "Indonesian" },
];

export const THEME_LABELS: Record<Language, Record<Theme, string>> = {
  en: { dark: "Dark", light: "Light", neon: "Neon" },
  id: { dark: "Gelap", light: "Terang", neon: "Neon" },
};

export const DEST_LABELS: Record<Language, Record<Destination, string>> = {
  en: { playground: "Playground", architecture: "Architecture", feedback: "Feedback" },
  id: { playground: "Playground", architecture: "Arsitektur", feedback: "Masukan" },
};

export type Copy = {
  eyebrow: string;
  title: string;
  lede: string;
  openCta: string;
  shortcut: string;
  notchHint: string;
  placeholder: string;
  run: string;
  close: string;
  examplesLabel: string;
  inspect: string;
  hide: string;
  status: {
    theme: (t: Theme) => string;
    language: (l: Language) => string;
    motionOn: string;
    motionOff: string;
    navigate: (d: Destination) => string;
    back: string;
    backNone: string;
    help: string;
    handoff: string;
    error: string;
    thinking: string;
    idle: string;
    unsure: string;
    empty: string;
  };
  examplesTitle: string;
  examplesLede: string;
  architectureTitle: string;
  architectureLede: string;
  steps: { n: string; title: string; body: string }[];
  inspectorTitle: string;
  inspectorLede: string;
  fields: { input: string; path: string; parsed: string; validation: string; adapter: string; outcome: string; latency: string; provider: string };
  pathLabels: { rule: string; ai: string; fallback: string };
  empty: string;
  aiOn: string;
  aiOff: string;
  feedbackTitle: string;
  feedbackLede: string;
  feedbackQuestions: string[];
  footer: string;
};

export const COPY: Record<Language, Copy> = {
  en: {
    eyebrow: "GN-013 · VESPER NOTCH",
    title: "Vesper turns a line of natural language into a safe, structured action — right from the notch.",
    lede: "Open the notch, type a short instruction, and watch it become one allow-listed action. Not a chatbot: it classifies intent, validates it, and runs one small demo action.",
    openCta: "Open the notch",
    shortcut: "⌘K / Ctrl+K",
    notchHint: "Command Vesper",
    placeholder: "Type a command… e.g. “make it neon”",
    run: "Run",
    close: "Close",
    examplesLabel: "Try:",
    inspect: "Inspect",
    hide: "Hide",
    status: {
      theme: (t) => `Theme set to ${THEME_LABELS.en[t]}.`,
      language: (l) => `Language set to ${LANGS.find((x) => x.id === l)?.label ?? l}.`,
      motionOn: "Motion resumed.",
      motionOff: "Motion paused.",
      navigate: (d) => `Jumped to ${DEST_LABELS.en[d]}.`,
      back: "Went back to where you were.",
      backNone: "There is nowhere to go back to yet.",
      help: "Here is what Vesper can do.",
      handoff: "That reads as a question, not a command. This showcase hands it off instead of answering it.",
      error: "Vesper could not reach a classifier. Local rules still work.",
      thinking: "Interpreting…",
      idle: "Ready.",
      unsure: "Not sure what you meant — try one of the examples.",
      empty: "There was nothing to act on.",
    },
    examplesTitle: "Example commands",
    examplesLede: "Click one to run it, or type your own. The same action should be reachable in several phrasings, in English and Indonesian.",
    architectureTitle: "How it works",
    architectureLede: "One line, one path, no hidden steps. Everything below is observable in the inspector.",
    steps: [
      { n: "01", title: "Normalise", body: "Trim, fold case, drop zero-width noise. The text stays data — it never becomes instructions." },
      { n: "02", title: "Local rules", body: "Deterministic English/Indonesian rules answer the obvious lines with no model call. This is Demo Mode." },
      { n: "03", title: "AI classification", body: "Optional. Only when no rule matches, and only through this app's own server route. The model returns one line." },
      { n: "04", title: "Validate", body: "The reply is parsed into an action and an argument and checked against a fixed allow-list. Anything else is rejected." },
      { n: "05", title: "Execute", body: "One allow-listed adapter runs, and it can only touch this page. The result is written to the trace you can read." },
    ],
    inspectorTitle: "Intent inspector",
    inspectorLede: "Only observable execution details. No hidden model reasoning, no invented confidence or token counts.",
    fields: { input: "Input", path: "Path", parsed: "Parsed", validation: "Validation", adapter: "Adapter", outcome: "Outcome", latency: "Latency", provider: "Provider" },
    pathLabels: { rule: "Local rule", ai: "AI classifier", fallback: "Fallback" },
    empty: "Run a command to see its trace here.",
    aiOn: "AI mode is on: unrecognised lines may be sent to a server-side classifier.",
    aiOff: "Demo Mode: no classifier key is configured, so only local rules run. Add a key to try AI mode.",
    feedbackTitle: "Feedback",
    feedbackLede: "This is a showcase, not a product. The most useful feedback is a phrase that broke it.",
    feedbackQuestions: [
      "Does the notch feel intuitive, or do you need a visible hint to discover it?",
      "Which phrases, slang, typos or language switches does the intent router misunderstand?",
      "Which action types would make a notch useful beyond themes and navigation?",
      "Where should confirmation be required before an action runs?",
    ],
    footer: "A standalone showcase. The notch is inspired by a private portfolio's nav island; no portfolio code runs here.",
  },
  id: {
    eyebrow: "GN-013 · VESPER NOTCH",
    title: "Vesper mengubah satu baris bahasa alami menjadi aksi terstruktur yang aman — langsung dari notch.",
    lede: "Buka notch, ketik instruksi singkat, dan lihat ia menjadi satu aksi yang lolos allow-list. Bukan chatbot: ia mengklasifikasi maksud, memvalidasinya, lalu menjalankan satu aksi demo kecil.",
    openCta: "Buka notch",
    shortcut: "⌘K / Ctrl+K",
    notchHint: "Perintah untuk Vesper",
    placeholder: "Ketik perintah… mis. “buat neon”",
    run: "Jalankan",
    close: "Tutup",
    examplesLabel: "Coba:",
    inspect: "Periksa",
    hide: "Sembunyikan",
    status: {
      theme: (t) => `Tema diubah ke ${THEME_LABELS.id[t]}.`,
      language: (l) => `Bahasa diubah ke ${LANGS.find((x) => x.id === l)?.label ?? l}.`,
      motionOn: "Animasi dilanjutkan.",
      motionOff: "Animasi dijeda.",
      navigate: (d) => `Melompat ke ${DEST_LABELS.id[d]}.`,
      back: "Kembali ke posisi sebelumnya.",
      backNone: "Belum ada yang bisa dituju kembali.",
      help: "Ini yang bisa dilakukan Vesper.",
      handoff: "Ini terdengar seperti pertanyaan, bukan perintah. Showcase ini menyerahkannya, bukan menjawabnya.",
      error: "Vesper tidak bisa menghubungi classifier. Aturan lokal tetap jalan.",
      thinking: "Menafsirkan…",
      idle: "Siap.",
      unsure: "Belum jelas maksudnya — coba salah satu contoh.",
      empty: "Tidak ada yang bisa dijalankan.",
    },
    examplesTitle: "Contoh perintah",
    examplesLede: "Klik salah satu untuk menjalankannya, atau ketik sendiri. Aksi yang sama harus bisa dicapai lewat beberapa frasa, dalam bahasa Inggris dan Indonesia.",
    architectureTitle: "Cara kerjanya",
    architectureLede: "Satu baris, satu jalur, tanpa langkah tersembunyi. Semua di bawah ini terlihat di inspector.",
    steps: [
      { n: "01", title: "Normalisasi", body: "Trim, samakan huruf, buang karakter tak terlihat. Teks tetap data — tidak pernah menjadi instruksi." },
      { n: "02", title: "Aturan lokal", body: "Aturan deterministik Inggris/Indonesia menjawab baris yang jelas tanpa panggilan model. Inilah Demo Mode." },
      { n: "03", title: "Klasifikasi AI", body: "Opsional. Hanya saat tak ada aturan yang cocok, dan hanya lewat route server aplikasi ini. Model mengembalikan satu baris." },
      { n: "04", title: "Validasi", body: "Balasan diurai menjadi aksi dan argumen lalu dicek terhadap allow-list tetap. Selain itu ditolak." },
      { n: "05", title: "Eksekusi", body: "Satu adapter yang diizinkan berjalan, dan hanya bisa menyentuh halaman ini. Hasilnya ditulis ke trace yang bisa kamu baca." },
    ],
    inspectorTitle: "Inspector maksud",
    inspectorLede: "Hanya detail eksekusi yang bisa diamati. Tanpa penalaran model tersembunyi, tanpa confidence atau jumlah token yang dibuat-buat.",
    fields: { input: "Input", path: "Jalur", parsed: "Terurai", validation: "Validasi", adapter: "Adapter", outcome: "Hasil", latency: "Latensi", provider: "Provider" },
    pathLabels: { rule: "Aturan lokal", ai: "Classifier AI", fallback: "Fallback" },
    empty: "Jalankan perintah untuk melihat trace-nya di sini.",
    aiOn: "Mode AI aktif: baris yang tak dikenali bisa dikirim ke classifier sisi server.",
    aiOff: "Demo Mode: tidak ada key classifier, jadi hanya aturan lokal yang jalan. Tambah key untuk mencoba mode AI.",
    feedbackTitle: "Masukan",
    feedbackLede: "Ini showcase, bukan produk. Masukan paling berguna adalah frasa yang membuatnya gagal.",
    feedbackQuestions: [
      "Apakah notch terasa intuitif, atau perlu petunjuk yang terlihat untuk menemukannya?",
      "Frasa, slang, typo, atau pergantian bahasa mana yang salah dipahami oleh router maksud?",
      "Jenis aksi apa yang membuat notch berguna selain tema dan navigasi?",
      "Di mana konfirmasi sebaiknya diminta sebelum aksi dijalankan?",
    ],
    footer: "Showcase mandiri. Notch ini terinspirasi dari nav island portfolio privat; tidak ada kode portfolio yang berjalan di sini.",
  },
};
