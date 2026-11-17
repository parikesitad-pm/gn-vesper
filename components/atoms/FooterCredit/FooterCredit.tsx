import "./FooterCredit.css";

export function FooterCredit({ year }: { year: number }) {
  return <p className="footer-credit">crafted by <a href="https://d-ap.my.id" target="_blank" rel="noopener noreferrer">dap_</a> · <a href="https://github.com/parikesitad-pm" target="_blank" rel="noopener noreferrer">a modula project</a> · © {year}</p>;
}
