/**
 * The only public creator identity and the only fetch targets. Everything Vesper says about dap_ must be
 * traceable to one of these URLs or to a page discovered from them; nothing else is a knowledge source.
 */
export const CREATOR = {
  handle: "dap_",
  name: "Dausan Adam Parikesit",
  url: "https://d-ap.my.id",
  label: "d-ap.my.id",
} as const;

export const SOURCE_ORIGIN = "https://d-ap.my.id";
export const LLMS_URL = `${SOURCE_ORIGIN}/llms.txt`;
export const LLMS_FULL_URL = `${SOURCE_ORIGIN}/llms-full.txt`;

/** When no canonical page URL can be established, link the full public text rather than invent a URL. */
export const FULL_TEXT_SOURCE = { title: "dap_ — full public profile", url: LLMS_FULL_URL } as const;

export const ABOUT_SOURCE = { title: "About dap_", url: `${SOURCE_ORIGIN}/about` } as const;

/** The verified creator website. Identity answers link this, never an invented Owl endpoint. */
export const CREATOR_SITE_SOURCE = { title: "dap_ — d-ap.my.id", url: CREATOR.url } as const;
