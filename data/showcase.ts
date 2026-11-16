import type { Language } from "@/lib/intent/types";

export const SHOWCASE = {
  en: {
    nav: ["Playground", "Architecture", "Observatory"],
    title: ["Small presence.", "Real intent."],
    intro: "Meet Vesper. A living command interface that turns your words into an action, or an answer with a source.",
    open: "Wake Vesper", explore: "Explore the system", scroll: "Scroll to explore",
    vessel: "Move your pointer. Vesper follows.", ready: "Awaiting your intent", paused: "Motion paused",
    labTitle: "Your words. The controls.", labIntro: "Change the atmosphere. Ask about the creator. One line is all it takes.",
    act: "Run a command", know: "Ask a question", run: "Run command", ask: "Ask Vesper",
    input: "Type a command or creator question", placeholder: "Make it neon…", questionPlaceholder: "Who created you?",
    empty: "Your next move starts here.", emptyDetail: "Type above or choose a phrase. Vesper will show its work.",
    architectureTitle: "Follow the intent.", architectureIntro: "One input, two paths. Every action is validated. Every creator answer points to a public source.",
    endTitle: "A small interface.\nAn open process.", endBody: "Vesper is GN-013, created by dap_. Try a phrase, inspect the result, and see exactly where it went.",
    feedback: "Share feedback on GitHub", source: "View source", pause: "Pause motion", resume: "Resume motion",
    theme: "Choose theme", language: "Switch to Indonesian", current: "Current atmosphere", demo: "LOCAL RULES", ai: "AI AVAILABLE",
    actions: ["Make it neon", "Switch to Indonesian", "Pause the motion", "Show the architecture", "Open the creator's website"],
    questions: ["Who are you?", "Who created Vesper?", "Who is Owl?", "What are dap_'s skills?", "Where is dap_ based?"],
  },
  id: {
    nav: ["Playground", "Arsitektur", "Observatorium"],
    title: ["Hadir kecil.", "Maksud jelas."],
    intro: "Kenali Vesper. Antarmuka perintah hidup yang mengubah kata-katamu menjadi aksi, atau jawaban dengan sumber.",
    open: "Bangunkan Vesper", explore: "Jelajahi sistem", scroll: "Gulir untuk menjelajah",
    vessel: "Gerakkan pointer. Vesper mengikuti.", ready: "Menunggu maksudmu", paused: "Animasi dijeda",
    labTitle: "Kata-katamu. Kendalinya.", labIntro: "Ubah suasana. Tanya tentang pembuatnya. Cukup satu baris.",
    act: "Jalankan perintah", know: "Ajukan pertanyaan", run: "Jalankan", ask: "Tanya Vesper",
    input: "Ketik perintah atau pertanyaan pembuat", placeholder: "Buat neon…", questionPlaceholder: "Siapa pembuatmu?",
    empty: "Langkah berikutnya dimulai di sini.", emptyDetail: "Ketik di atas atau pilih contoh. Vesper akan menunjukkan prosesnya.",
    architectureTitle: "Ikuti maksudnya.", architectureIntro: "Satu input, dua jalur. Setiap aksi divalidasi. Setiap jawaban pembuat menunjuk sumber publik.",
    endTitle: "Antarmuka kecil.\nProses terbuka.", endBody: "Vesper adalah GN-013, dibuat oleh dap_. Coba frasa, periksa hasilnya, dan lihat ke mana maksudmu pergi.",
    feedback: "Kirim masukan di GitHub", source: "Lihat kode", pause: "Jeda animasi", resume: "Lanjutkan animasi",
    theme: "Pilih tema", language: "Switch to English", current: "Suasana saat ini", demo: "ATURAN LOKAL", ai: "AI TERSEDIA",
    actions: ["Buat neon", "Ganti ke bahasa Inggris", "Jeda animasi", "Tampilkan arsitektur", "Buka website dap_"],
    questions: ["Siapa kamu?", "Siapa pembuat Vesper?", "Siapa Owl?", "Apa keahlian dap_?", "Di mana dap_ tinggal?"],
  },
} satisfies Record<Language, object>;

export type ShowcaseCopy = typeof SHOWCASE[Language];
