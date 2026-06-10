import { useEffect, useState } from 'react'
import { analyze, type AnalysisResult } from './lib/analyze'
import { DEMO_LICENSE_KEY, GUMROAD_PRODUCT_ID, GUMROAD_URL, PRO_PRICE } from './config'
import { SAMPLE_JD, SAMPLE_RESUME } from './sample'

const FREE_MISSING_LIMIT = 5

function useLicense() {
  const [pro, setPro] = useState(() => localStorage.getItem('resumatch_pro') === '1')
  const activate = () => {
    localStorage.setItem('resumatch_pro', '1')
    setPro(true)
  }
  return { pro, activate }
}

async function verifyLicense(key: string): Promise<boolean> {
  const trimmed = key.trim()
  if (!trimmed) return false
  if (!GUMROAD_PRODUCT_ID) return trimmed === DEMO_LICENSE_KEY
  try {
    const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ product_id: GUMROAD_PRODUCT_ID, license_key: trimmed }),
    })
    const data = await res.json()
    return data.success === true && data.purchase?.refunded !== true
  } catch {
    return false
  }
}

function ScoreRing({ score }: { score: number }) {
  const r = 64
  const c = 2 * Math.PI * r
  const color = score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'
  return (
    <div className="relative h-44 w-44">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#e8ecf4" strokeWidth="14" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs font-medium tracking-wide text-ink-500 uppercase">match score</span>
      </div>
    </div>
  )
}

function Chip({ label, kind }: { label: string; kind: 'ok' | 'miss' | 'req' }) {
  const styles =
    kind === 'ok'
      ? 'bg-green-50 text-green-700 border-green-200'
      : kind === 'req'
        ? 'bg-red-50 text-red-700 border-red-300 font-semibold'
        : 'bg-amber-50 text-amber-800 border-amber-200'
  return (
    <span className={`inline-block rounded-full border px-3 py-1 text-sm ${styles}`}>{label}</span>
  )
}

function UnlockModal({
  onClose,
  onUnlocked,
}: {
  onClose: () => void
  onUnlocked: () => void
}) {
  const [key, setKey] = useState('')
  const [state, setState] = useState<'idle' | 'checking' | 'bad'>('idle')

  const submit = async () => {
    setState('checking')
    if (await verifyLicense(key)) onUnlocked()
    else setState('bad')
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold">Unlock ResuMatch Pro</h3>
        <p className="mt-2 text-sm text-ink-500">
          One-time {PRO_PRICE} — lifetime access on this device. Full missing-keyword list,
          requirements-section flags, and exportable reports.
        </p>
        <a
          href={GUMROAD_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-5 block w-full rounded-xl bg-brand-500 py-3 text-center font-semibold text-white hover:bg-brand-600"
        >
          Get a license key — {PRO_PRICE}
        </a>
        <div className="mt-5 border-t border-ink-300/30 pt-4">
          <label className="text-sm font-medium text-ink-700">Already purchased? Enter your key:</label>
          <div className="mt-2 flex gap-2">
            <input
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                setState('idle')
              }}
              placeholder="XXXXXXXX-XXXXXXXX-…"
              className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              onClick={submit}
              disabled={state === 'checking'}
              className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-700 disabled:opacity-50"
            >
              {state === 'checking' ? '…' : 'Activate'}
            </button>
          </div>
          {state === 'bad' && (
            <p className="mt-2 text-sm text-red-600">That key didn't verify — check for typos.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [resume, setResume] = useState('')
  const [jd, setJd] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [showUnlock, setShowUnlock] = useState(false)
  const { pro, activate } = useLicense()

  useEffect(() => {
    if (result) document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
  }, [result])

  const run = () => setResult(analyze(resume, jd))
  const loadSample = () => {
    setResume(SAMPLE_RESUME)
    setJd(SAMPLE_JD)
    setResult(analyze(SAMPLE_RESUME, SAMPLE_JD))
  }

  const visibleMissing = result ? (pro ? result.missing : result.missing.slice(0, FREE_MISSING_LIMIT)) : []
  const hiddenCount = result ? result.missing.length - visibleMissing.length : 0

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="no-print sticky top-0 z-40 border-b border-ink-300/20 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <a href="#" className="text-lg font-bold tracking-tight">
            Resu<span className="text-brand-500">Match</span>
          </a>
          <nav className="flex items-center gap-5 text-sm font-medium text-ink-500">
            <a href="#how" className="hover:text-ink-900">How it works</a>
            <a href="#faq" className="hover:text-ink-900">FAQ</a>
            {pro ? (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">PRO</span>
            ) : (
              <button
                onClick={() => setShowUnlock(true)}
                className="rounded-full bg-brand-500 px-4 py-1.5 text-white hover:bg-brand-600"
              >
                Go Pro
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="no-print mx-auto max-w-3xl px-4 pt-14 pb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Beat the resume robots.
          <span className="block text-brand-500">Match before you apply.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-500">
          75% of resumes are rejected by ATS software before a human reads them. Paste your resume
          and the job description — get your match score and the exact keywords you're missing.
        </p>
        <p className="mt-3 text-sm font-medium text-ink-500">
          🔒 100% private — analysis runs in your browser. Nothing is uploaded. No signup.
        </p>
      </section>

      {/* Tool */}
      <section className="no-print mx-auto max-w-5xl px-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-ink-300/40 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <label className="font-semibold">📄 Your resume</label>
              <span className="text-xs text-ink-300">{resume.trim() ? `${resume.trim().split(/\s+/).length} words` : ''}</span>
            </div>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste the full text of your resume here…"
              className="h-64 w-full resize-y rounded-lg border border-ink-300/40 p-3 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="rounded-2xl border border-ink-300/40 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <label className="font-semibold">🎯 Job description</label>
              <span className="text-xs text-ink-300">{jd.trim() ? `${jd.trim().split(/\s+/).length} words` : ''}</span>
            </div>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job posting you're applying to…"
              className="h-64 w-full resize-y rounded-lg border border-ink-300/40 p-3 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={run}
            disabled={!resume.trim() || !jd.trim()}
            className="rounded-xl bg-brand-500 px-8 py-3 text-lg font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Scan my resume →
          </button>
          <button onClick={loadSample} className="text-sm font-medium text-brand-600 underline-offset-2 hover:underline">
            Try with sample data
          </button>
        </div>
      </section>

      {/* Results */}
      {result && (
        <section id="results" className="mx-auto max-w-5xl px-4 py-12">
          <div className="rounded-3xl border border-ink-300/30 bg-gradient-to-b from-brand-50/60 to-white p-6 sm:p-10">
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
              <ScoreRing score={result.score} />
              <div className="flex-1">
                <h2 className="text-2xl font-bold">
                  {result.score >= 75 ? 'Strong match — polish and apply' : result.score >= 50 ? 'Decent match — worth optimizing' : 'Weak match — needs work before applying'}
                </h2>
                <p className="mt-1 text-ink-500">
                  {result.matched.length} of {result.keywords.length} key terms from this job
                  description appear in your resume.
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-white p-3 shadow-sm">
                    <dt className="text-xs text-ink-500">Resume length</dt>
                    <dd className="text-lg font-bold">{result.stats.resumeWords}w</dd>
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-sm">
                    <dt className="text-xs text-ink-500">Quantified lines</dt>
                    <dd className="text-lg font-bold">{result.stats.quantifiedLines}</dd>
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-sm">
                    <dt className="text-xs text-ink-500">Action-verb bullets</dt>
                    <dd className="text-lg font-bold">{result.stats.actionVerbRatio}%</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Missing */}
            <div className="mt-10">
              <h3 className="text-lg font-bold">
                ❌ Missing keywords <span className="font-normal text-ink-500">({result.missing.length})</span>
              </h3>
              <p className="mt-1 text-sm text-ink-500">
                Sorted by importance. Bold red = from the requirements section.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {visibleMissing.map((k) => (
                  <Chip key={k.term} label={k.term} kind={k.inRequirements ? 'req' : 'miss'} />
                ))}
                {hiddenCount > 0 && (
                  <button
                    onClick={() => setShowUnlock(true)}
                    className="no-print inline-block rounded-full border border-dashed border-brand-500 bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-600 hover:bg-brand-100"
                  >
                    + {hiddenCount} more — unlock with Pro
                  </button>
                )}
              </div>
            </div>

            {/* Matched */}
            <div className="mt-8">
              <h3 className="text-lg font-bold">
                ✅ Matched keywords <span className="font-normal text-ink-500">({result.matched.length})</span>
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.matched.map((k) => (
                  <Chip key={k.term} label={k.term} kind="ok" />
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="mt-10 rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">💡 How to improve</h3>
              <ul className="mt-3 space-y-2">
                {result.tips.map((t, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-700">
                    <span className="text-brand-500">▸</span>
                    {t}
                  </li>
                ))}
              </ul>
              {pro && (
                <button
                  onClick={() => window.print()}
                  className="no-print mt-5 rounded-lg border border-ink-300 px-4 py-2 text-sm font-semibold hover:bg-ink-900 hover:text-white"
                >
                  Export report (PDF)
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="how" className="no-print mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            ['1. Paste both texts', 'Your resume and the job posting. No file upload, no account, no waiting.'],
            ['2. We extract what matters', 'The engine weighs every skill and phrase in the posting — requirements-section terms count double.'],
            ['3. Fix the gaps, then apply', 'See exactly which keywords to add and where your bullets are weak. Re-scan until you clear 75.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-ink-300/30 p-6">
              <h3 className="font-bold">{title}</h3>
              <p className="mt-2 text-sm text-ink-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="no-print bg-ink-900 py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold">Free to use. {PRO_PRICE} once to master it.</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">
            Job-tracking subscriptions charge $50/month for this. ResuMatch Pro is a one-time
            purchase — because a job search shouldn't be a subscription.
          </p>
          <div className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 p-6 text-left">
              <h3 className="font-bold">Free</h3>
              <p className="mt-1 text-3xl font-extrabold">$0</p>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                <li>✓ Unlimited scans</li>
                <li>✓ Match score + resume stats</li>
                <li>✓ Top {FREE_MISSING_LIMIT} missing keywords</li>
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-brand-500 bg-white/5 p-6 text-left">
              <h3 className="font-bold text-brand-100">Pro — lifetime</h3>
              <p className="mt-1 text-3xl font-extrabold">{PRO_PRICE}</p>
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                <li>✓ Everything in Free</li>
                <li>✓ Full missing-keyword list</li>
                <li>✓ Requirements-section flags</li>
                <li>✓ Exportable PDF reports</li>
              </ul>
              <button
                onClick={() => setShowUnlock(true)}
                className="mt-5 w-full rounded-xl bg-brand-500 py-2.5 font-bold hover:bg-brand-600"
              >
                {pro ? 'Activated ✓' : 'Unlock Pro'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="no-print mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">FAQ</h2>
        <div className="mt-8 space-y-6">
          {[
            ['Is my resume uploaded anywhere?', 'No. The entire analysis runs in your browser with JavaScript. Close the tab and it’s gone. That’s also why it’s instant.'],
            ['What is an ATS?', 'Applicant Tracking Systems (Workday, Greenhouse, Lever…) scan and rank resumes by keyword relevance before a recruiter looks. If the posting says "GraphQL" and your resume doesn’t, you rank lower — even if you know it.'],
            ['Should I just stuff every keyword in?', 'No — add only terms that are honestly true for you. The goal is to surface skills you have but forgot to state in the posting’s exact language.'],
            ['Why one-time pricing?', 'A job search lasts weeks, not years. Pay once, use it for every application, done.'],
          ].map(([q, a]) => (
            <div key={q}>
              <h3 className="font-bold">{q}</h3>
              <p className="mt-1 text-sm text-ink-500">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="no-print border-t border-ink-300/20 py-8 text-center text-sm text-ink-500">
        © 2026 ResuMatch · Built for job seekers · 100% in-browser
      </footer>

      {showUnlock && !pro && (
        <UnlockModal
          onClose={() => setShowUnlock(false)}
          onUnlocked={() => {
            activate()
            setShowUnlock(false)
          }}
        />
      )}
    </div>
  )
}
