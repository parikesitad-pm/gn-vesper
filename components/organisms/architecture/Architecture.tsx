import type { Copy } from "@/lib/copy";
import type { ShowcaseCopy } from "@/data/showcase";
import "./Architecture.css";

export function Architecture({ text, copy }: { text: ShowcaseCopy; copy: Copy }) {
  return <section id="architecture" className="architecture section-space">
    <div className="architecture-heading"><span className="section-index">02 / ARCHITECTURE</span><h2>{text.architectureTitle}</h2><p>{text.architectureIntro}</p><div className="route-key"><span>ACT <span>→</span> ACTION</span><span>KNOW <span>→</span> SOURCE</span></div></div>
    <ol className="pipeline">{copy.steps.map((step) => <li className="pipeline-step" key={step.n}>
      <div className="pipeline-rail"><span className="pipeline-node">{step.n}</span><span className="pipeline-track"><span className="pipeline-track-fill" /></span></div>
      <div className="pipeline-content"><h3>{step.title}</h3><p>{step.body}</p></div>
    </li>)}</ol>
  </section>;
}
