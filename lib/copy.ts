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
    creator: string;
    creatorBlocked: string;
    error: string;
    thinking: string;
    idle: string;
    unsure: string;
    empty: string;
  };
  creator: {
    label: string;
    name: string;
    site: string;
  };
  knowledge: {
    sources: string;
    retrieved: string;
    answerLabel: string;
    unsupported: string;
    error: string;
  };
  examplesTitle: string;
  examplesLede: string;
  architectureTitle: string;
  architectureLede: string;
  steps: { n: string; title: string; body: string }[];
  inspectorTitle: string;
  inspectorLede: string;
  fields: {
    input: string;
    kind: string;
    path: string;
    parsed: string;
    validation: string;
    adapter: string;
    outcome: string;
    latency: string;
    provider: string;
    attempts: string;
    sources: string;
    retrieved: string;
    mode: string;
  };
  pathLabels: { rule: string; ai: string; fallback: string };
  kindLabels: { act: string; know: string };
  modeLabels: { identity: string; grounded: string; extractive: string; unsupported: string };
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
    eyebrow: "GN-013 · VESPER",
    title: "Vesper turns one line into a safe action, or an answer grounded in dap_'s public site.",
    lede: "A compact glass notch with two jobs. ACT understands a command and runs one allow-listed action on this page. KNOW answers questions about its creator, dap_, using retrieval from d-ap.my.id — and says “not on record” rather than inventing a fact.",
    openCta: "Open the notch",
    shortcut: "⌘K / Ctrl+K",
    notchHint: "Command or ask Vesper",
    placeholder: "Ask or command… e.g. “make it neon”",
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
      handoff: "That reads as a question about the showcase, not a creator question. Try asking about dap_.",
      creator: "Opened d-ap.my.id in a new tab. If it did not open, use the creator card.",
      creatorBlocked: "The browser blocked the new tab. Open d-ap.my.id from the creator card.",
      error: "Vesper could not reach a provider. Local rules still work.",
      thinking: "Interpreting…",
      idle: "Ready.",
      unsure: "Not sure what you meant — try one of the examples.",
      empty: "There was nothing to act on.",
    },
    creator: {
      label: "Created by",
      name: "Dausan Adam Parikesit",
      site: "d-ap.my.id",
    },
    knowledge: {
      sources: "Sources",
      retrieved: "Retrieved public chunks",
      answerLabel: "Answer",
      unsupported: "That is not on record in dap_'s public site.",
      error: "Vesper could not build a grounded answer. The public source is still available at d-ap.my.id.",
    },
    examplesTitle: "Example commands and questions",
    examplesLede: "Click one to run it, or type your own. ACT is reachable in several phrasings in English and Indonesian; KNOW answers only from the public source.",
    architectureTitle: "How it works",
    architectureLede: "Two paths, one notch. Everything below is observable in the inspector.",
    steps: [
      { n: "01", title: "Normalise", body: "Trim, fold case, drop zero-width noise. The text stays data — it never becomes instructions." },
      { n: "02", title: "Route", body: "A deterministic rule decides ACT or KNOW. Commands never reach retrieval, and retrieved text never becomes an action." },
      { n: "03", title: "Act or retrieve", body: "ACT asks Groq to classify an unrecognised command, with Gemini as fallback. KNOW runs deterministic BM25 over d-ap.my.id's public text." },
      { n: "04", title: "Validate", body: "A classifier reply is parsed into an action and argument and checked against a fixed allow-list. Anything else is rejected." },
      { n: "05", title: "Ground", body: "KNOW sends only the top public chunks to Gemini, then Groq. The answer must cite its sources or say it is not on record." },
      { n: "06", title: "Report", body: "One adapter changes this page, or one answer appears in the tray with source links, the provider, and measured latency." },
    ],
    inspectorTitle: "Intent observatory",
    inspectorLede: "Only observable execution details: the path taken, the provider that answered, measured latency and fallbacks, validated output and retrieved public chunks. No hidden reasoning, no invented confidence or token counts.",
    fields: {
      input: "Input",
      kind: "Kind",
      path: "Path",
      parsed: "Parsed",
      validation: "Validation",
      adapter: "Adapter",
      outcome: "Outcome",
      latency: "Latency",
      provider: "Provider",
      attempts: "Attempts",
      sources: "Sources",
      retrieved: "Retrieved",
      mode: "Answer mode",
    },
    pathLabels: { rule: "Local rule", ai: "AI classifier", fallback: "Fallback" },
    kindLabels: { act: "ACT · action", know: "KNOW · creator knowledge" },
    modeLabels: { identity: "Deterministic identity", grounded: "Grounded by a model", extractive: "Extractive (no model)", unsupported: "Not on record" },
    empty: "Run a command or ask a question to see its trace here.",
    aiOn: "AI mode is on: commands may use Groq with Gemini fallback; creator answers use Gemini with Groq fallback.",
    aiOff: "Demo Mode: no provider key is configured. Commands use local rules; creator answers quote the public source instead of calling a model.",
    feedbackTitle: "Feedback",
    feedbackLede: "This is a showcase, not a product. The most useful feedback is a phrase or a question that broke it.",
    feedbackQuestions: [
      "Does the notch feel intuitive for both a command and a creator question?",
      "Which phrases, slang, typos or language switches does the router misunderstand?",
      "Which creator questions retrieve the wrong public page, or miss an obvious one?",
      "Where should Vesper say “not on record” instead of trying to answer?",
      "Are the provider, model, latency and source links clear enough to trust the answer?",
    ],
    footer: "A standalone showcase. Vesper is inspired by a private portfolio's nav island; no portfolio code runs here.",
  },
  id: {
    eyebrow: "GN-013 · VESPER",
    title: "Vesper mengubah satu baris menjadi aksi yang aman, atau jawaban yang bersumber dari situs publik dap_.",
    lede: "Notch kaca ringkas dengan dua tugas. ACT memahami perintah dan menjalankan satu aksi yang lolos allow-list di halaman ini. KNOW menjawab pertanyaan tentang pembuatnya, dap_, lewat retrieval dari d-ap.my.id — dan berkata “tidak ada di catatan” daripada mengarang fakta.",
    openCta: "Buka notch",
    shortcut: "⌘K / Ctrl+K",
    notchHint: "Perintah atau tanya Vesper",
    placeholder: "Tanya atau perintah… mis. “buat neon”",
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
      handoff: "Ini pertanyaan tentang showcase, bukan tentang pembuatnya. Coba tanya tentang dap_.",
      creator: "d-ap.my.id dibuka di tab baru. Jika tidak terbuka, gunakan kartu pembuat.",
      creatorBlocked: "Browser memblokir tab baru. Buka d-ap.my.id dari kartu pembuat.",
      error: "Vesper tidak bisa menghubungi provider. Aturan lokal tetap jalan.",
      thinking: "Menafsirkan…",
      idle: "Siap.",
      unsure: "Belum jelas maksudnya — coba salah satu contoh.",
      empty: "Tidak ada yang bisa dijalankan.",
    },
    creator: {
      label: "Dibuat oleh",
      name: "Dausan Adam Parikesit",
      site: "d-ap.my.id",
    },
    knowledge: {
      sources: "Sumber",
      retrieved: "Potongan publik yang diambil",
      answerLabel: "Jawaban",
      unsupported: "Itu tidak ada di catatan publik dap_.",
      error: "Vesper tidak bisa menyusun jawaban bersumber. Situs publiknya tetap tersedia di d-ap.my.id.",
    },
    examplesTitle: "Contoh perintah dan pertanyaan",
    examplesLede: "Klik salah satu untuk menjalankannya, atau ketik sendiri. ACT bisa dicapai lewat beberapa frasa dalam bahasa Inggris dan Indonesia; KNOW hanya menjawab dari sumber publik.",
    architectureTitle: "Cara kerjanya",
    architectureLede: "Dua jalur, satu notch. Semua di bawah ini terlihat di inspector.",
    steps: [
      { n: "01", title: "Normalisasi", body: "Trim, samakan huruf, buang karakter tak terlihat. Teks tetap data — tidak pernah menjadi instruksi." },
      { n: "02", title: "Rute", body: "Aturan deterministik memilih ACT atau KNOW. Perintah tidak pernah masuk retrieval, dan teks hasil retrieval tidak pernah menjadi aksi." },
      { n: "03", title: "Aksi atau retrieval", body: "ACT meminta Groq mengklasifikasi perintah yang belum dikenali, dengan Gemini sebagai fallback. KNOW menjalankan BM25 deterministik atas teks publik d-ap.my.id." },
      { n: "04", title: "Validasi", body: "Balasan classifier diurai menjadi aksi dan argumen lalu dicek terhadap allow-list tetap. Selain itu ditolak." },
      { n: "05", title: "Grounding", body: "KNOW mengirim hanya potongan publik teratas ke Gemini, lalu Groq. Jawaban wajib menyebut sumber atau berkata tidak ada di catatan." },
      { n: "06", title: "Laporan", body: "Satu adapter mengubah halaman ini, atau satu jawaban muncul di tray dengan tautan sumber, provider, dan latensi terukur." },
    ],
    inspectorTitle: "Observatorium maksud",
    inspectorLede: "Hanya detail eksekusi yang bisa diamati: jalur, provider yang menjawab, latensi dan fallback terukur, output tervalidasi, dan potongan publik yang diambil. Tanpa penalaran tersembunyi, tanpa confidence atau jumlah token yang dibuat-buat.",
    fields: {
      input: "Input",
      kind: "Jenis",
      path: "Jalur",
      parsed: "Terurai",
      validation: "Validasi",
      adapter: "Adapter",
      outcome: "Hasil",
      latency: "Latensi",
      provider: "Provider",
      attempts: "Percobaan",
      sources: "Sumber",
      retrieved: "Retrieval",
      mode: "Mode jawaban",
    },
    pathLabels: { rule: "Aturan lokal", ai: "Classifier AI", fallback: "Fallback" },
    kindLabels: { act: "ACT · aksi", know: "KNOW · pengetahuan pembuat" },
    modeLabels: { identity: "Identitas deterministik", grounded: "Grounded oleh model", extractive: "Ekstraktif (tanpa model)", unsupported: "Tidak ada di catatan" },
    empty: "Jalankan perintah atau ajukan pertanyaan untuk melihat trace-nya di sini.",
    aiOn: "Mode AI aktif: perintah bisa memakai Groq dengan fallback Gemini; jawaban pembuat memakai Gemini dengan fallback Groq.",
    aiOff: "Demo Mode: tidak ada key provider. Perintah memakai aturan lokal; jawaban pembuat mengutip sumber publik tanpa memanggil model.",
    feedbackTitle: "Masukan",
    feedbackLede: "Ini showcase, bukan produk. Masukan paling berguna adalah frasa atau pertanyaan yang membuatnya gagal.",
    feedbackQuestions: [
      "Apakah notch terasa intuitif untuk perintah maupun pertanyaan tentang pembuat?",
      "Frasa, slang, typo, atau pergantian bahasa mana yang salah dipahami oleh router?",
      "Pertanyaan pembuat mana yang mengambil halaman publik yang salah, atau melewatkan yang jelas?",
      "Di mana Vesper sebaiknya berkata “tidak ada di catatan” daripada mencoba menjawab?",
      "Apakah provider, model, latensi, dan tautan sumber cukup jelas untuk dipercaya?",
    ],
    footer: "Showcase mandiri. Vesper terinspirasi dari nav island portfolio privat; tidak ada kode portfolio yang berjalan di sini.",
  },
};
