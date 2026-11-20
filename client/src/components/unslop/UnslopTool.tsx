import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type EditMode = 'free' | 'careful' | 'minimal'
type Finding = { label: string; count: number; kind: 'fixed' | 'review' }

const sample = `Our platform isn't just a tool. It's a game-changer that helps teams plan, track, and analyze their work. Additionally, it serves as a robust solution for today's fast-paced landscape, highlighting the importance of clear collaboration.`

const replacements: Array<[RegExp, string, string]> = [
  [/\bIt(?:'|’)s important to note that\s*/gi, '', 'Didactic disclaimer'],
  [/\bWorth noting,?\s*/gi, '', 'Didactic disclaimer'],
  [/\bAdditionally,?\s*/gi, 'Also, ', 'Mechanical connective'],
  [/\bMoreover,?\s*/gi, 'Also, ', 'Mechanical connective'],
  [/\bFurthermore,?\s*/gi, 'Also, ', 'Mechanical connective'],
  [/\bIn today(?:'|’)s fast-paced world,?\s*/gi, '', 'Template opener'],
  [/\bdelve into\b/gi, 'look at', 'AI vocabulary'],
  [/\bserves as\b/gi, 'is', 'Copula avoidance'],
  [/\bstands as\b/gi, 'is', 'Copula avoidance'],
  [/\bboasts\b/gi, 'has', 'Promotional tone'],
  [/\bgame-changer\b/gi, 'useful change', 'Dramatization'],
  [/\bhighlighting the importance of\s*/gi, '', 'Superficial analysis'],
]

function applyEdit(source: string, mode: EditMode) {
  let text = source.replace(/\s*[—–]\s*/g, ', ')
  const findings = new Map<string, Finding>()
  const track = (label: string) => {
    const current = findings.get(label) ?? {
      label,
      count: 0,
      kind: 'fixed' as const,
    }
    findings.set(label, { ...current, count: current.count + 1 })
  }
  if (source.match(/[—–]/g)?.length) track('Em dash')
  replacements.forEach(([pattern, replacement, label], index) => {
    if (mode === 'minimal' && index > 4) return
    if (mode === 'careful' && ['Dramatization', 'AI vocabulary'].includes(label)) return
    const matches = text.match(pattern)
    if (matches?.length) {
      track(label)
      text = text.replace(pattern, replacement)
    }
  })
  const reviewPatterns: Array<[RegExp, string]> = [
    [/\bnot (?:just|only)\b|\bit(?:'|’)s not .{1,80}, it(?:'|’)s/gi, 'Negative parallelism'],
    [/\b(?:in summary|overall),?\b/gi, 'Self-summary'],
  ]
  reviewPatterns.forEach(([pattern, label]) => {
    const count = text.match(pattern)?.length ?? 0
    if (count) findings.set(label, { label, count, kind: 'review' })
  })
  text = text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim()
  return { text, findings: [...findings.values()] }
}

export function UnslopTool() {
  const [source, setSource] = useState(sample)
  const [mode, setMode] = useState<EditMode>('free')
  const [edited, setEdited] = useState('')
  const [findings, setFindings] = useState<Finding[]>([])
  const wordCount = useMemo(
    () => (source.trim() ? source.trim().split(/\s+/).length : 0),
    [source]
  )
  const humanize = () => {
    const result = applyEdit(source, mode)
    setEdited(result.text)
    setFindings(result.findings)
    toast.info('Draft processed', {
      description: `Identified and reviewed ${result.findings.length} patterns.`,
    })
  }
  const copyResult = async () => {
    if (edited) {
      await navigator.clipboard.writeText(edited)
      toast.success('Copied to clipboard', {
        description: 'Clean text is ready to paste.',
      })
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <section className="space-y-2">
        <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          Unslop Prose Editor
        </p>
        <h2 className="text-2xl font-medium tracking-tight">Keep the thought. Lose the glaze.</h2>
        <p className="text-xs text-muted-foreground">
          A local editor for obvious tells: padded phrasing, copula avoidance, and artificial transitions.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <span className="text-xs font-medium text-muted-foreground">{wordCount} words</span>
          <div className="flex gap-1">
            {(['free', 'careful', 'minimal'] as EditMode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  mode === item
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Paste draft here…"
          rows={5}
          className="mt-3 w-full resize-y rounded-lg border border-input bg-background p-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-foreground"
        />

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setSource(sample)
              setEdited('')
              setFindings([])
            }}
            className="text-xs text-muted-foreground hover:underline"
          >
            Load sample
          </button>
          <button
            type="button"
            onClick={humanize}
            className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background hover:opacity-90"
          >
            Humanize draft
          </button>
        </div>
      </section>

      {(edited || findings.length > 0) && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs font-medium text-muted-foreground">Cleaned text</span>
              <button
                type="button"
                onClick={copyResult}
                className="text-xs font-medium text-foreground hover:underline"
              >
                Copy
              </button>
            </div>
            <p className="mt-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {edited || 'No edits needed.'}
            </p>
          </article>

          <aside className="rounded-xl border border-border bg-card p-4">
            <span className="text-xs font-medium text-muted-foreground">Identified patterns</span>
            <ul className="mt-3 space-y-1.5 text-xs">
              {findings.map((f) => (
                <li key={f.label} className="flex items-center justify-between text-muted-foreground">
                  <span>{f.label}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                    {f.count}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </section>
      )}
    </div>
  )
}
