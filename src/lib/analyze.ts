// ResuMatch core engine — extracts weighted keywords from a job description
// and scores a resume against them. Runs entirely in the browser.

export interface Keyword {
  term: string
  weight: number
  matched: boolean
  inRequirements: boolean
}

export interface AnalysisResult {
  score: number // 0–100
  keywords: Keyword[]
  matched: Keyword[]
  missing: Keyword[]
  stats: {
    resumeWords: number
    quantifiedLines: number
    bulletLines: number
    actionVerbRatio: number
  }
  tips: string[]
}

const STOPWORDS = new Set(
  `a an and are as at be been being but by can could did do does doing for from had has have having he her hers him his how i if in into is it its itself just me more most my no nor not of off on once only or other our ours out over own same she so some such than that the their theirs them then there these they this those through to too under until up very was we were what when where which while who whom why will with you your yours yourself
about above after again against all am any because before below between both down during each few further here once
ability able across additional advantage along already also always among amount andor anyone applicable apply approach appropriate area areas around aspects assigned available based basic basis become becomes begin behind benefits best better beyond big bonus bring broad build building business candidate candidates career center certain challenges chance changes click closely com come comfortable commitment common communicate communication company competitive complete comprehensive concepts conditions consider considered contact contribute core country cover create creating critical culture current currently customer customers daily date day days deep degree deliver demonstrated department depending description desired detail details develop developing development different directly discuss diverse drive duties dynamic e eg eager early effective effectively efficient effort employee employees employer employment encourage end engage enjoy ensure ensuring environment equal equivalent etc every excellent exciting existing expect experience experienced experiences expertise external familiar familiarity fast field fields fit flexible focus focused follow following formal forward full fully function functions future g general get give global go goals good great group groups grow growing growth hand hands help high highly hire hiring hours ideal ideally identify impact important improve include includes including individual individuals industry information initiative innovative inside insurance interact interested internal job join key knowledge large lead leader leadership learn least less level levels life like limited listed live ll location long looking love made maintain major make making manner many may medical member members mind minimum mission month months motivated must necessary need needed needs new next nice note number offer offers one ongoing open opportunities opportunity order org organization oriented others outside paid part participate parts passion passionate pay people per perform performance person personal place plan plans play please plus point position positions possible practices prefer preferred primary prior priorities proactive process processes products professional proficiency proficient program programs proven provide providing purpose qualification qualifications quality range rapidly real receive recent record related relevant remote report reports required requirements responsibilities responsibility responsible responsive resume right role roles salary schedule seeking self send senior set setting share shift show similar since size skill skills small solid solve solving someone soon sound span specific spirit stay status step strategy strong strongly subject success successful successfully suitable support take takes talented task tasks team teams tech technical technologies technology tell things think thinking time times title today together tools top total track train training travel two type types understand understanding unique us use used using value values varied variety various vision want wants way ways week well wide within without word work worked working world would write written year years yes yet`.split(
    /\s+/,
  ),
)

// Common hard skills / tools get a weight boost — buyers of the JD's attention.
const KNOWN_SKILLS = new Set(
  `javascript typescript python java golang rust ruby php swift kotlin dart scala perl matlab
react angular vue svelte nextjs nuxt flutter electron redux graphql rest grpc websocket
node nodejs django flask fastapi rails spring laravel express nestjs
sql mysql postgresql postgres mongodb redis elasticsearch sqlite dynamodb oracle nosql
aws azure gcp kubernetes docker terraform ansible jenkins circleci heroku vercel netlify
git github gitlab jira confluence figma sketch photoshop illustrator
excel powerpoint tableau powerbi looker snowflake dbt airflow spark hadoop kafka
seo sem ppc crm salesforce hubspot shopify wordpress webflow
agile scrum kanban devops cicd tdd oop microservices serverless
linux unix bash powershell nginx apache
tensorflow pytorch keras pandas numpy scikit nlp llm openai langchain
html css sass tailwind bootstrap webpack vite babel eslint jest cypress playwright vitest
ios android xcode gradle firebase supabase stripe twilio oauth jwt saml
accounting quickbooks sap erp autocad solidworks revit bim
copywriting analytics ga4 mixpanel amplitude segment hotjar zapier airtable notion asana
recruiting onboarding payroll compliance gdpr hipaa soc2 iso
photoshop premiere aftereffects davinci blender unity unreal`.split(/\s+/),
)

const ACTION_VERB_LIST = `led built designed developed launched created shipped managed drove increased reduced improved delivered implemented architected automated optimized scaled migrated mentored owned negotiated grew achieved generated saved streamlined established founded directed coordinated analyzed researched published presented won wrote integrated redesigned refactored spearheaded accelerated transformed modernized initiated trained`.split(
  /\s+/,
)

const REQ_HEADING =
  /requirement|qualification|must.have|what (you('|’)?ll|we('|’)?re looking|you need|you('|’)?ll bring)|skills?\b|who you are|about you|minimum|preferred/i

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’´`]/g, "'")
    .replace(/[^a-z0-9+#./'\- ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .map((t) => t.replace(/^[-./']+|[-./']+$/g, ''))
    .filter((t) => t.length > 1 || t === 'r' || t === 'c')
}

// Light stemmer: trailing s / es / ed / ing → base-ish form.
function stem(word: string): string {
  if (word.length <= 4) return word
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.endsWith('ing') && word.length > 6) return word.slice(0, -3)
  if (word.endsWith('ed') && word.length > 5) return word.slice(0, -2)
  if (word.endsWith('es') && word.length > 5) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

function isNoise(token: string): boolean {
  return STOPWORDS.has(token) || /^\d+([.,]\d+)?$/.test(token)
}

interface Candidate {
  term: string
  count: number
  inRequirements: boolean
  words: string[]
}

/** Extract weighted candidate keywords (uni/bi/trigrams) from the JD. */
function extractKeywords(jd: string): Candidate[] {
  const lines = jd.split(/\n+/)
  const candidates = new Map<string, Candidate>()
  let inReqSection = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // A short line matching a requirements-style heading flips the section flag.
    if (trimmed.length < 80 && REQ_HEADING.test(trimmed)) inReqSection = true
    else if (trimmed.length < 60 && /^[A-Z][\w\s&/-]+:?$/.test(trimmed)) inReqSection = false

    const tokens = tokenize(trimmed)
    for (let n = 1; n <= 3; n++) {
      for (let i = 0; i + n <= tokens.length; i++) {
        const words = tokens.slice(i, i + n)
        if (words.some(isNoise)) continue
        if (n > 1 && words.every((w) => KNOWN_SKILLS.has(w))) continue // covered as unigrams
        const term = words.join(' ')
        const existing = candidates.get(term)
        if (existing) {
          existing.count++
          existing.inRequirements ||= inReqSection
        } else {
          candidates.set(term, { term, count: 1, inRequirements: inReqSection, words })
        }
      }
    }
  }

  return [...candidates.values()]
}

function weightOf(c: Candidate): number {
  let w = Math.min(c.count, 4) // frequency, capped
  if (c.inRequirements) w *= 2
  if (c.words.some((word) => KNOWN_SKILLS.has(word))) w *= 2.5
  if (c.words.length > 1) w *= 1.3 // specific phrases beat single words
  return w
}

export function analyze(resume: string, jd: string): AnalysisResult {
  const candidates = extractKeywords(jd)
    .map((c) => ({ c, w: weightOf(c) }))
    .filter(
      ({ c, w }) =>
        w >= 2.5 || (c.words.length > 1 && c.count >= 2) || c.words.some((x) => KNOWN_SKILLS.has(x)),
    )
    .sort((a, b) => b.w - a.w)

  // Greedy pick: skip terms subsumed by an already-picked longer phrase and vice versa.
  const picked: { c: Candidate; w: number }[] = []
  for (const item of candidates) {
    if (picked.length >= 30) break
    const overlaps = picked.some(
      ({ c }) => c.term.includes(item.c.term) || item.c.term.includes(c.term),
    )
    if (!overlaps) picked.push(item)
  }

  const resumeNorm = normalize(resume)
  const resumeStems = new Set(tokenize(resume).map(stem))

  const keywords: Keyword[] = picked.map(({ c, w }) => {
    const phraseHit = resumeNorm.includes(c.term)
    const allWordsHit = c.words.every((word) => resumeStems.has(stem(word)))
    return {
      term: c.term,
      weight: w,
      matched: phraseHit || allWordsHit,
      inRequirements: c.inRequirements,
    }
  })

  const totalWeight = keywords.reduce((s, k) => s + k.weight, 0)
  const matchedWeight = keywords.filter((k) => k.matched).reduce((s, k) => s + k.weight, 0)
  const score = totalWeight === 0 ? 0 : Math.round((matchedWeight / totalWeight) * 100)

  // Resume quality stats
  const resumeLines = resume.split(/\n+/).filter((l) => l.trim())
  const bulletLines = resumeLines.filter((l) => /^\s*[-•*▪◦‣]/.test(l))
  const quantifiedLines = resumeLines.filter((l) => /\d/.test(l) && /[%$]|\d{2,}/.test(l))
  const actionVerbStems = new Set(ACTION_VERB_LIST.map(stem))
  const verbLines = bulletLines.filter((l) => {
    const first = tokenize(l)[0]
    return first !== undefined && (actionVerbStems.has(first) || actionVerbStems.has(stem(first)))
  })

  const stats = {
    resumeWords: tokenize(resume).length,
    quantifiedLines: quantifiedLines.length,
    bulletLines: bulletLines.length,
    actionVerbRatio: bulletLines.length
      ? Math.round((verbLines.length / bulletLines.length) * 100)
      : 0,
  }

  const missing = keywords.filter((k) => !k.matched).sort((a, b) => b.weight - a.weight)
  const matched = keywords.filter((k) => k.matched).sort((a, b) => b.weight - a.weight)

  const tips: string[] = []
  if (score < 75 && missing.length > 0)
    tips.push(
      `Work the top missing keywords into your summary, skills section, and bullet points — but only where they're true. ATS filters rank exact terms.`,
    )
  const missingReq = missing.filter((k) => k.inRequirements)
  if (missingReq.length > 0)
    tips.push(
      `${missingReq.length} missing keyword${missingReq.length > 1 ? 's' : ''} came from the requirements section — recruiters weight these most. Address them first.`,
    )
  if (stats.quantifiedLines < 3)
    tips.push(
      `Only ${stats.quantifiedLines} line${stats.quantifiedLines === 1 ? '' : 's'} of your resume contain measurable results. Add numbers (%, $, time saved) to your strongest bullets.`,
    )
  if (stats.actionVerbRatio < 50 && stats.bulletLines > 3)
    tips.push(
      `Only ${stats.actionVerbRatio}% of your bullet points start with a strong action verb (led, built, increased…). Rewrite weak openers.`,
    )
  if (stats.resumeWords > 900)
    tips.push(
      `Your resume is ~${stats.resumeWords} words — likely over 2 pages. Recruiters skim; cut to the most relevant experience for this role.`,
    )
  if (tips.length === 0)
    tips.push(`Strong match. Mirror the job title itself somewhere in your summary, then ship the application.`)

  return { score, keywords, matched, missing, stats, tips }
}
