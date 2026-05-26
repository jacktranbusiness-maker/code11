import Head from 'next/head'
import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Constants ──────────────────────────────────────────────────────────────
const DOMAIN = '79ai.net'
const MODEL = 'seedance_20_pro_edit'
const MODE = 'business_fast'
const POLL_MS = 8000

const ST = {
  PENDING: 'MEDIA_GENERATION_STATUS_PENDING',
  ACTIVE: 'MEDIA_GENERATION_STATUS_ACTIVE',
  PROC: 'MEDIA_GENERATION_STATUS_PROCESSING',
  DONE: 'MEDIA_GENERATION_STATUS_SUCCESSFUL',
  FAIL: 'MEDIA_GENERATION_STATUS_FAILED',
}

const STATUS_LABEL = {
  [ST.PENDING]: 'Pending',
  [ST.ACTIVE]: 'Active',
  [ST.PROC]: 'Processing…',
  [ST.DONE]: 'Done',
  [ST.FAIL]: 'Failed',
}

const RATIOS = ['16:9', '9:16', '1:1', '3:4', '4:3', '21:9']
const DURATIONS = ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']

let _uid = 0
const uid = () => String(++_uid)

function elapsed(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}m ${sec}s`
}

function truncate(str, n = 60) {
  return str.length > n ? str.slice(0, n) + '…' : str
}

// ─── API helper ─────────────────────────────────────────────────────────────
async function gommo(endpoint, body) {
  const res = await fetch('/api/gommo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, ...body }),
  })
  return res.json()
}

// ─── Components ─────────────────────────────────────────────────────────────
function Badge({ children, color = 'zinc' }) {
  const colors = {
    zinc: 'bg-zinc-800 text-zinc-400',
    green: 'bg-emerald-950 text-emerald-400 border border-emerald-900',
    blue: 'bg-blue-950 text-blue-400 border border-blue-900',
    yellow: 'bg-yellow-950 text-yellow-400 border border-yellow-900',
    red: 'bg-red-950 text-red-400 border border-red-900',
    purple: 'bg-purple-950 text-purple-400 border border-purple-900',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

function Spinner({ size = 4 }) {
  return (
    <svg
      className={`animate-spin w-${size} h-${size} text-emerald-400`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function StatCard({ label, value, sub, color = 'zinc' }) {
  const textColor = {
    zinc: 'text-zinc-100',
    green: 'text-emerald-400',
    blue: 'text-blue-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
  }
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${textColor[color]}`}>{value}</span>
      {sub && <span className="text-xs text-zinc-600">{sub}</span>}
    </div>
  )
}

function JobCard({ job, onRetry }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const statusMap = {
    [ST.PENDING]: { dot: 'bg-zinc-500', badge: 'zinc' },
    [ST.ACTIVE]: { dot: 'bg-blue-400 animate-pulse', badge: 'blue' },
    [ST.PROC]: { dot: 'bg-emerald-400 animate-pulse', badge: 'green' },
    [ST.DONE]: { dot: 'bg-emerald-400', badge: 'green' },
    [ST.FAIL]: { dot: 'bg-red-400', badge: 'red' },
  }
  const { dot, badge } = statusMap[job.status] || { dot: 'bg-zinc-500', badge: 'zinc' }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
          <span className="text-sm text-zinc-300 truncate font-mono text-xs">{job.id.slice(0, 16)}…</span>
        </div>
        <Badge color={badge}>{STATUS_LABEL[job.status] || job.status}</Badge>
      </div>
      <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">{job.prompt}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-zinc-600 font-mono">{elapsed(job.startAt)}</span>
        {job.status === ST.FAIL && onRetry && (
          <button
            onClick={() => onRetry(job)}
            className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            Retry ↺
          </button>
        )}
      </div>
      {job.url && (
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download video
        </a>
      )}
    </div>
  )
}

function LogLine({ log }) {
  const color = {
    info: 'text-zinc-500',
    success: 'text-emerald-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  }
  return (
    <div className={`flex gap-3 items-start py-1 border-b border-zinc-900 log-enter ${color[log.t]}`}>
      <span className="text-zinc-700 font-mono text-xs flex-shrink-0 pt-0.5">{log.ts}</span>
      <span className="text-xs font-mono leading-relaxed">{log.msg}</span>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Home() {
  // Config
  const [token, setToken] = useState('')
  const [maxC, setMaxC] = useState(4)
  const [ratio, setRatio] = useState('16:9')
  const [duration, setDuration] = useState('5')
  const [privacy, setPrivacy] = useState('PRIVATE')
  const [translate, setTranslate] = useState(false)
  const [showConfig, setShowConfig] = useState(true)

  // Queue state
  const [input, setInput] = useState('')
  const [queue, setQueue] = useState([])
  const [active, setActive] = useState([])
  const [done, setDone] = useState([])
  const [failed, setFailed] = useState([])
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState([])

  // UI
  const [tab, setTab] = useState('active')
  const [copyMsg, setCopyMsg] = useState('')

  // Refs for interval callbacks
  const qRef = useRef([])
  const aRef = useRef([])
  const runRef = useRef(false)
  const cfgRef = useRef({ token, maxC, ratio, duration, privacy, translate })
  const timerRef = useRef(null)
  const logsEndRef = useRef(null)

  useEffect(() => { qRef.current = queue }, [queue])
  useEffect(() => { aRef.current = active }, [active])
  useEffect(() => { runRef.current = running }, [running])
  useEffect(() => {
    cfgRef.current = { token, maxC, ratio, duration, privacy, translate }
  }, [token, maxC, ratio, duration, privacy, translate])

  const log = useCallback((msg, t = 'info') => {
    const ts = new Date().toLocaleTimeString('vi-VN', { hour12: false })
    setLogs(p => [{ msg, t, ts, id: uid() }, ...p].slice(0, 400))
  }, [])

  // ── Tick function (runs every POLL_MS) ──────────────────────────────────
  const tick = useCallback(async () => {
    if (!runRef.current) return
    const { token: tok, maxC: mx, ratio: r, duration: d, privacy: prv, translate: tr } = cfgRef.current
    if (!tok) return

    let cur = [...aRef.current]
    const curQ = [...qRef.current]

    // Poll active jobs
    for (const job of cur) {
      try {
        const data = await gommo('check-video', { access_token: tok, domain: DOMAIN, videoId: job.id })
        if (data.status === ST.DONE) {
          if (data.download_url) {
            cur = cur.filter(j => j.id !== job.id)
            setActive(p => p.filter(j => j.id !== job.id))
            setDone(p => [{ ...job, url: data.download_url, status: ST.DONE, finAt: Date.now() }, ...p])
            log(`✓ ${job.id.slice(0, 10)}… completed`, 'success')
          } else {
            log(`${job.id.slice(0, 10)}… DONE — URL pending, retrying…`, 'warn')
          }
        } else if (data.status === ST.FAIL) {
          cur = cur.filter(j => j.id !== job.id)
          setActive(p => p.filter(j => j.id !== job.id))
          setFailed(p => [{ ...job, status: ST.FAIL, error: 'Generation failed' }, ...p])
          log(`✗ ${job.id.slice(0, 10)}… failed`, 'error')
        } else if (data.status) {
          setActive(p => p.map(j => j.id === job.id ? { ...j, status: data.status } : j))
        }
      } catch (e) {
        log(`Poll error [${job.id.slice(0, 8)}]: ${e.message}`, 'error')
      }
    }

    // Fill empty slots
    const slots = mx - cur.length
    const toSub = curQ.slice(0, Math.max(0, slots))

    for (const item of toSub) {
      try {
        log(`→ Submitting: "${truncate(item.prompt, 45)}"`)
        const data = await gommo('create-video', {
          access_token: tok,
          domain: DOMAIN,
          model: MODEL,
          mode: MODE,
          privacy: prv,
          prompt: item.prompt,
          translate_to_en: tr ? 'true' : 'false',
          ratio: r,
          resolution: '720p',
          duration: d,
        })

        if (data.videoInfo) {
          const job = {
            id: data.videoInfo.id_base,
            prompt: item.prompt,
            status: data.videoInfo.status || ST.PENDING,
            startAt: Date.now(),
            url: null,
          }
          cur.push(job)
          setActive(p => [...p, job])
          setQueue(p => p.filter(q => q.id !== item.id))
          log(`Queued → ${data.videoInfo.id_base.slice(0, 10)}…`, 'success')
        } else {
          const errMsg = data.message || JSON.stringify(data)
          log(`Submit failed: ${errMsg}`, 'error')
          setQueue(p => p.filter(q => q.id !== item.id))
          setFailed(p => [{ id: item.id, prompt: item.prompt, status: ST.FAIL, error: errMsg, startAt: Date.now() }, ...p])
        }
      } catch (e) {
        log(`Submit error: ${e.message}`, 'error')
      }
    }

    // Check completion
    if (qRef.current.length === 0 && aRef.current.length === 0 && runRef.current) {
      log('🎉 All jobs completed!', 'success')
      setRunning(false)
    }
  }, [log])

  useEffect(() => {
    if (running) {
      tick()
      timerRef.current = setInterval(tick, POLL_MS)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [running, tick])

  // ── Actions ──────────────────────────────────────────────────────────────
  const start = () => {
    if (!token.trim()) { log('Access token is required', 'error'); return }
    if (queue.length === 0 && active.length === 0) { log('Queue is empty — add prompts first', 'error'); return }
    setRunning(true)
    log('▶ Queue started', 'success')
    setTab('active')
  }

  const stop = () => {
    setRunning(false)
    log('⏸ Queue paused', 'warn')
  }

  const addPrompts = () => {
    const lines = input.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) return
    setQueue(p => [...p, ...lines.map(prompt => ({ id: uid(), prompt }))])
    setInput('')
    log(`Added ${lines.length} prompt${lines.length > 1 ? 's' : ''} to queue`, 'info')
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').map(l => l.trim()).filter(Boolean)
      setQueue(p => [...p, ...lines.map(prompt => ({ id: uid(), prompt }))])
      log(`Uploaded ${lines.length} prompts from ${file.name}`, 'success')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const retryJob = (job) => {
    setFailed(p => p.filter(j => j.id !== job.id))
    setQueue(p => [...p, { id: uid(), prompt: job.prompt }])
    log(`Re-queued: "${truncate(job.prompt, 40)}"`, 'info')
  }

  const retryAll = () => {
    const toRetry = failed.map(j => ({ id: uid(), prompt: j.prompt }))
    setFailed([])
    setQueue(p => [...p, ...toRetry])
    log(`Moved ${toRetry.length} failed jobs back to queue`, 'info')
  }

  const copyLinks = () => {
    const links = done.filter(j => j.url).map(j => j.url).join('\n')
    if (!links) return
    navigator.clipboard.writeText(links).then(() => {
      setCopyMsg('Copied!')
      setTimeout(() => setCopyMsg(''), 2000)
    })
  }

  const tabs = [
    { id: 'active', label: 'Active', count: active.length },
    { id: 'done', label: 'Done', count: done.length },
    { id: 'failed', label: 'Failed', count: failed.length },
    { id: 'logs', label: 'Logs', count: logs.length },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Seedance Queue — 79ai.net</title>
        <meta name="description" content="Seedance 2.0 Omni video queue manager" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        {/* Top nav */}
        <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-semibold">Seedance Queue</h1>
                <p className="text-xs text-zinc-500 font-mono">79ai.net · seedance_20_pro_edit</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {running && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs">
                  <Spinner size={3} />
                  <span>Running</span>
                </div>
              )}
              <button
                onClick={running ? stop : start}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  running
                    ? 'bg-red-950 border border-red-800 text-red-400 hover:bg-red-900'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {running ? '⏸ Pause' : '▶ Start'}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Queue" value={queue.length} sub="waiting" />
            <StatCard label="Active" value={`${active.length}/${maxC}`} sub="concurrent" color="blue" />
            <StatCard label="Done" value={done.length} sub="completed" color="green" />
            <StatCard label="Failed" value={failed.length} sub="errors" color={failed.length > 0 ? 'red' : 'zinc'} />
          </div>

          {/* Config panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowConfig(p => !p)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium">Configuration</span>
                {token && <Badge color="green">✓ Token set</Badge>}
              </div>
              <svg className={`w-4 h-4 text-zinc-500 transition-transform ${showConfig ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showConfig && (
              <div className="border-t border-zinc-800 px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Token */}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-zinc-500 mb-1.5 font-mono">access_token *</label>
                  <input
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="Paste your API token here…"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-600 transition-colors"
                  />
                </div>

                {/* Max concurrent */}
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Max concurrent</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={8}
                      value={maxC}
                      onChange={e => setMaxC(Number(e.target.value))}
                      className="flex-1 accent-emerald-500"
                    />
                    <span className="text-sm font-mono text-emerald-400 w-6 text-center">{maxC}</span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">Pro plan: 4 concurrent for Seedance 2.0 Omni</p>
                </div>

                {/* Ratio */}
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Ratio</label>
                  <div className="flex flex-wrap gap-1.5">
                    {RATIOS.map(r => (
                      <button
                        key={r}
                        onClick={() => setRatio(r)}
                        className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                          ratio === r
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Duration</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DURATIONS.map(d => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                          duration === d
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy + Translate */}
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">Privacy</label>
                    <select
                      value={privacy}
                      onChange={e => setPrivacy(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-600"
                    >
                      <option>PRIVATE</option>
                      <option>PUBLIC</option>
                    </select>
                  </div>
                  <div className="pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={translate}
                        onChange={e => setTranslate(e.target.checked)}
                        className="accent-emerald-500"
                      />
                      <span className="text-sm text-zinc-300">Auto translate → EN</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Prompt input */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <span className="text-sm font-medium">Prompt Queue</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={queue.length > 0 ? 'yellow' : 'zinc'}>{queue.length} waiting</Badge>
                {queue.length > 0 && (
                  <button
                    onClick={() => setQueue([])}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="p-5 space-y-3">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); addPrompts() }
                }}
                placeholder={`One prompt per line. Ctrl+Enter to add.\n\nExample:\nA cinematic aerial shot of Ha Long Bay at dawn\nA tiger running through bamboo forest, slow motion\nA futuristic city at night with neon lights reflecting on wet streets`}
                rows={5}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-600 transition-colors resize-y font-mono leading-relaxed"
              />

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={addPrompts}
                  disabled={!input.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add to queue
                </button>

                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer transition-colors border border-zinc-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload TXT / CSV
                  <input type="file" accept=".txt,.csv" onChange={handleFile} className="hidden" />
                </label>
              </div>

              {/* Queue preview */}
              {queue.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-800 divide-y divide-zinc-800">
                  {queue.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/50 group">
                      <span className="text-xs text-zinc-600 font-mono w-5 text-right flex-shrink-0">{i + 1}</span>
                      <span className="text-xs text-zinc-400 flex-1 truncate">{item.prompt}</span>
                      <button
                        onClick={() => setQueue(p => p.filter(q => q.id !== item.id))}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Jobs panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-zinc-800">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                    tab === t.id
                      ? 'border-emerald-500 text-emerald-400 bg-zinc-800/30'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                      tab === t.id ? 'bg-emerald-900 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* Active tab */}
              {tab === 'active' && (
                active.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-600">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82V15.18a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">{running ? 'Polling… waiting for jobs to start' : 'Press Start to begin processing'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {active.map(job => <JobCard key={job.id} job={job} />)}
                  </div>
                )
              )}

              {/* Done tab */}
              {tab === 'done' && (
                done.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-600">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">No completed videos yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-500">{done.filter(j => j.url).length} videos ready to download</p>
                      <div className="flex gap-2">
                        <button
                          onClick={copyLinks}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          {copyMsg || 'Copy all links'}
                        </button>
                        <button
                          onClick={() => setDone([])}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {done.map(job => <JobCard key={job.id} job={job} />)}
                    </div>
                  </div>
                )
              )}

              {/* Failed tab */}
              {tab === 'failed' && (
                failed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-600">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">No failed jobs — nice!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={retryAll} className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors">
                        Retry all ↺
                      </button>
                      <button onClick={() => setFailed([])} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                        Clear
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {failed.map(job => <JobCard key={job.id} job={job} onRetry={retryJob} />)}
                    </div>
                  </div>
                )
              )}

              {/* Logs tab */}
              {tab === 'logs' && (
                <div className="space-y-1">
                  <div className="flex justify-end mb-2">
                    <button onClick={() => setLogs([])} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                      Clear logs
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto font-mono">
                    {logs.length === 0 ? (
                      <p className="text-zinc-600 text-sm text-center py-8">No logs yet</p>
                    ) : (
                      logs.map(l => <LogLine key={l.id} log={l} />)
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-zinc-700 pb-4 font-mono space-y-1">
            <p>model: {MODEL} · mode: {MODE} · poll: {POLL_MS / 1000}s · resolution: 720p</p>
            <p>CORS-free via Next.js API proxy · Deploy to Vercel for best performance</p>
          </div>
        </main>
      </div>
    </>
  )
}
