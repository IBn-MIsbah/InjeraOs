import { useMemo, useState } from "react";

type EditMode = "free" | "careful" | "minimal";
type Finding = { label: string; count: number; kind: "fixed" | "review" };

const sample = `Our platform isn't just a tool. It's a game-changer that helps teams plan, track, and analyze their work. Additionally, it serves as a robust solution for today's fast-paced landscape, highlighting the importance of clear collaboration.`;

const replacements: Array<[RegExp, string, string]> = [
  [/\bIt(?:'|’)s important to note that\s*/gi, "", "Didactic disclaimer"],
  [/\bWorth noting,?\s*/gi, "", "Didactic disclaimer"],
  [/\bAdditionally,?\s*/gi, "Also, ", "Mechanical connective"],
  [/\bMoreover,?\s*/gi, "Also, ", "Mechanical connective"],
  [/\bFurthermore,?\s*/gi, "Also, ", "Mechanical connective"],
  [/\bIn today(?:'|’)s fast-paced world,?\s*/gi, "", "Template opener"],
  [/\bdelve into\b/gi, "look at", "AI vocabulary"],
  [/\bserves as\b/gi, "is", "Copula avoidance"],
  [/\bstands as\b/gi, "is", "Copula avoidance"],
  [/\bboasts\b/gi, "has", "Promotional tone"],
  [/\bgame-changer\b/gi, "useful change", "Dramatization"],
  [/\bhighlighting the importance of\s*/gi, "", "Superficial analysis"],
];

function applyEdit(source: string, mode: EditMode) {
  let text = source.replace(/\s*[—–]\s*/g, ", ");
  const findings = new Map<string, Finding>();
  const track = (label: string) => {
    const current = findings.get(label) ?? {
      label,
      count: 0,
      kind: "fixed" as const,
    };
    findings.set(label, { ...current, count: current.count + 1 });
  };
  if (source.match(/[—–]/g)?.length) track("Em dash");
  replacements.forEach(([pattern, replacement, label], index) => {
    if (mode === "minimal" && index > 4) return;
    if (
      mode === "careful" &&
      ["Dramatization", "AI vocabulary"].includes(label)
    )
      return;
    const matches = text.match(pattern);
    if (matches?.length) {
      track(label);
      text = text.replace(pattern, replacement);
    }
  });
  const reviewPatterns: Array<[RegExp, string]> = [
    [
      /\bnot (?:just|only)\b|\bit(?:'|’)s not .{1,80}, it(?:'|’)s/gi,
      "Negative parallelism",
    ],
    [/\b(?:in summary|overall),?\b/gi, "Self-summary"],
  ];
  reviewPatterns.forEach(([pattern, label]) => {
    const count = text.match(pattern)?.length ?? 0;
    if (count) findings.set(label, { label, count, kind: "review" });
  });
  text = text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
  return { text, findings: [...findings.values()] };
}

function App() {
  const [source, setSource] = useState(sample);
  const [mode, setMode] = useState<EditMode>("free");
  const [edited, setEdited] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const wordCount = useMemo(
    () => (source.trim() ? source.trim().split(/\s+/).length : 0),
    [source],
  );
  const humanize = () => {
    const result = applyEdit(source, mode);
    setEdited(result.text);
    setFindings(result.findings);
  };
  const copyResult = async () => {
    if (edited) await navigator.clipboard.writeText(edited);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Unslop home">
          un<span>slop</span>
        </a>
        <p>Write it like a person.</p>
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setSource(sample);
            setEdited("");
            setFindings([]);
          }}
        >
          Try an example
        </button>
      </header>
      <section className="intro" id="top">
        <p className="eyebrow">A plain-language editing pass</p>
        <h1>
          Keep the thought.
          <br />
          <em>Lose the machine glaze.</em>
        </h1>
        <p className="lede">
          A local editor for the obvious tells: padded phrasing, promotional
          language, and mechanical transitions. It leaves the decisions that
          need a writer to you.
        </p>
      </section>
      <section className="editor" aria-label="Writing editor">
        <div className="editor-head">
          <div>
            <p className="panel-label">Your draft</p>
            <span>{wordCount} words</span>
          </div>
          <div className="modes" aria-label="Editing mode">
            {(["free", "careful", "minimal"] as EditMode[]).map((item) => (
              <button
                className={mode === item ? "active" : ""}
                type="button"
                key={item}
                onClick={() => setMode(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder="Paste a draft here…"
          aria-label="Your draft"
        />
        <div className="editor-footer">
          <span>
            {mode === "free"
              ? "Cuts filler where it can."
              : mode === "careful"
                ? "Keeps more of the original shape."
                : "Touches only clear patterns."}
          </span>
          <button className="primary" type="button" onClick={humanize}>
            Edit this draft <span>↗</span>
          </button>
        </div>
      </section>
      {(edited || findings.length > 0) && (
        <section className="result-grid" aria-live="polite">
          <article className="result-card">
            <div className="result-title">
              <p className="panel-label">Edited draft</p>
              <button
                className="text-button"
                type="button"
                onClick={copyResult}
              >
                Copy
              </button>
            </div>
            <p className="edited-copy">{edited || "Nothing to change yet."}</p>
          </article>
          <aside className="notes-card">
            <p className="panel-label">What changed</p>
            {findings.length ? (
              <ul>
                {findings.map((item) => (
                  <li key={item.label}>
                    <span className={item.kind}>
                      {item.kind === "fixed" ? "Fixed" : "Review"}
                    </span>
                    {item.label}
                    <b>{item.count}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="quiet">
                This draft did not match the local checks.
              </p>
            )}
            <p className="note">
              Review flags are deliberately left alone. A browser rule cannot
              know what you mean.
            </p>
          </aside>
        </section>
      )}
      <section className="principles">
        <p className="eyebrow">What this does</p>
        <div>
          <h2>Start with what can be checked.</h2>
          <p>
            It normalizes punctuation and removes a small set of worn-out
            phrases. Then it points out patterns where deleting or rewriting a
            sentence would change the author’s meaning.
          </p>
        </div>
        <div>
          <h2>Don’t invent the interesting part.</h2>
          <p>
            No made-up specifics, fake examples, or confidence dressing. If a
            draft needs facts or a stronger point, that is a gap to fill with
            real material.
          </p>
        </div>
      </section>
    </main>
  );
}

export default App;
