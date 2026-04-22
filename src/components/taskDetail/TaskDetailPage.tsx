import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import Highcharts from 'highcharts'
import HighchartsReactModule from 'highcharts-react-official'
// Vite pre-bundles the CJS package as `export default module.exports` — unwrap the actual component
const HighchartsReact: React.ComponentType<any> =
  (HighchartsReactModule as any).default ?? HighchartsReactModule
import { useAppStore } from '../../store/useAppStore'
import { nsaThemesConfig } from '../../data/nsaThemesConfig'
import { getLocationsForRec } from '../../data/locationsData'
import type { ChecklistStep } from '../../types'

const BASE = import.meta.env.BASE_URL

// ── Styled dark tooltip wrapper ───────────────────────────────────────────────
function StyledTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 bg-[#212121] text-white text-[11px] leading-[16px] rounded-full whitespace-nowrap pointer-events-none z-50 shadow-sm">
          {label}
        </div>
      )}
    </div>
  )
}

// ── Pin icon ──────────────────────────────────────────────────────────────────
function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
      <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

// ── Platform favicon helpers ──────────────────────────────────────────────────
const PLATFORM_DOMAIN_MAP: Record<string, string> = {
  gemini: 'gemini.google.com',
  chatGPT: 'chatgpt.com',
  perplexity: 'perplexity.ai',
}
function getFaviconUrl(platform: string): string {
  const domain = PLATFORM_DOMAIN_MAP[platform] ?? (platform.includes('.') ? platform : null)
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : ''
}
const PLATFORM_BADGE_COLORS: Record<string, string> = {
  SWOT: 'bg-[#e8f4fd] text-[#1976d2]',
  'Multiple sources': 'bg-[#f3f4f6] text-[#555]',
}
function PlatformIcon({ platform }: { platform: string }) {
  const faviconUrl = getFaviconUrl(platform)
  if (faviconUrl) {
    return (
      <img src={faviconUrl} alt={platform} className="w-4 h-4 rounded-sm flex-shrink-0"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
    )
  }
  const colorClass = PLATFORM_BADGE_COLORS[platform] ?? 'bg-[#f3f4f6] text-[#555]'
  return (
    <span className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-medium flex-shrink-0 ${colorClass}`}>
      {platform.charAt(0).toUpperCase()}
    </span>
  )
}

// ── Rich step box ─────────────────────────────────────────────────────────────
function StepRichBox({ step }: { step: ChecklistStep }) {
  const [copied, setCopied] = useState<string | null>(null)
  function copyToClipboard(value: string, key: string) {
    navigator.clipboard.writeText(value).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500) })
  }

  if (step.stepType === 'link' && step.links && step.links.length > 0) {
    return (
      <div className="mt-2 border border-[#eaeaea] rounded-lg overflow-hidden">
        {step.links.map((link, i) => (
          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-[#eaeaea] last:border-b-0 hover:bg-[#fafafa] transition-colors group">
            <span className="text-[13px] text-[#1976d2] leading-[20px] group-hover:underline">{link.label}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-60 group-hover:opacity-100">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        ))}
      </div>
    )
  }

  if (step.stepType === 'nap' && step.napData) {
    const { name, address, phone } = step.napData
    const rows = [{ key: 'name', label: 'Business name', value: name }, { key: 'address', label: 'Address', value: address }, { key: 'phone', label: 'Phone', value: phone }]
    return (
      <div className="mt-2 border border-[#eaeaea] rounded-lg overflow-hidden">
        {rows.map(row => (
          <div key={row.key} className="flex items-center gap-3 px-3 py-2.5 border-b border-[#eaeaea] last:border-b-0 bg-white">
            <span className="text-[11px] text-[#888] leading-[16px] w-24 flex-shrink-0 uppercase tracking-[0.3px]">{row.label}</span>
            <span className="text-[13px] text-[#212121] leading-[20px] flex-1 min-w-0">{row.value}</span>
            <button onClick={() => copyToClipboard(row.value, row.key)} title="Copy"
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-[#f0f0f0] transition-colors">
              {copied === row.key
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#377e2c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              }
            </button>
          </div>
        ))}
      </div>
    )
  }

  if (step.stepType === 'keyword' && step.keywords && step.keywords.length > 0) {
    return (
      <div className="mt-2 border border-[#eaeaea] rounded-lg px-3 py-2.5">
        <div className="flex flex-wrap gap-1.5">
          {step.keywords.map((kw, i) => (
            <span key={i} onClick={() => copyToClipboard(kw, `kw-${i}`)} title="Click to copy"
              className="inline-flex items-center gap-1.5 bg-white text-[#212121] border border-[#eaeaea] rounded px-2 py-1 text-[12px] leading-[18px] cursor-pointer hover:bg-[#f5f5f5] transition-colors">
              {kw}
              {copied === `kw-${i}`
                ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#377e2c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              }
            </span>
          ))}
        </div>
        <p className="text-[11px] text-[#888] mt-2 leading-[16px]">Click any phrase to copy it</p>
      </div>
    )
  }

  if (step.targetPage && (step.stepType === 'task' || !step.stepType)) {
    return (
      <div className="mt-2 border border-[#eaeaea] rounded-lg px-3 py-2.5 flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className="text-[12px] text-[#555] leading-[18px] truncate">{step.targetPage}</span>
      </div>
    )
  }

  return null
}

// ── Card action buttons (export + more) ───────────────────────────────────────
function CardActions() {
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button title="Export" className="w-7 h-7 flex items-center justify-center border border-[#eaeaea] rounded hover:bg-[#f5f5f5] transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </button>
      <button title="More" className="w-7 h-7 flex items-center justify-center border border-[#eaeaea] rounded hover:bg-[#f5f5f5] transition-colors">
        <img src={`${BASE}assets/dot-3.svg`} alt="More" className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Highcharts citation bar chart ─────────────────────────────────────────────
const PLATFORMS = ['ChatGPT', 'Gemini', 'Perplexity', 'Claude'] as const
type Platform = typeof PLATFORMS[number]

interface CitationBarChartProps {
  competitors: import('../../types').Competitor[]
  youCitations: number
  themeLabel: string
  llmSummary: string
  prompt0?: string
}

// ChatGPT-style response panel
function ChatGPTResponsePanel({ prompt, competitors, platform }: {
  prompt: string
  competitors: import('../../types').Competitor[]
  platform: Platform
}) {
  // Gather snippets for this platform across all competitors (sorted by citation rank)
  const snippets = [...competitors]
    .sort((a, b) => a.citationRank - b.citationRank)
    .flatMap(c =>
      (c.platformSnippets ?? [])
        .filter(ps => ps.platform === platform)
        .map(ps => ({ name: c.name, snippet: ps.snippet }))
    )

  // Platform icon colours
  const platformColor: Record<Platform, string> = {
    ChatGPT: '#10a37f',
    Gemini: '#4285f4',
    Perplexity: '#20b2aa',
    Claude: '#d97706',
  }
  const color = platformColor[platform]

  return (
    <div className="mt-1 mb-3 rounded-lg border border-[#eaeaea] overflow-hidden">
      {/* Prompt / question row */}
      <div className="flex items-start gap-3 px-4 py-3 bg-[#fafafa] border-b border-[#eaeaea]">
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#ede9fe' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#6834B7">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-1 4h2v8h-2V9z"/>
          </svg>
        </div>
        <p className="text-[13px] text-[#212121] leading-[20px] flex-1 min-w-0">
          {prompt}
        </p>
      </div>

      {/* Response row */}
      <div className="flex items-start gap-3 px-4 py-4 bg-white">
        {/* Platform logo circle */}
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-[10px] font-bold" style={{ backgroundColor: color }}>
          {platform === 'ChatGPT' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
            </svg>
          ) : platform[0]}
        </div>

        {/* Response content */}
        <div className="flex-1 min-w-0">
          {snippets.length > 0 ? (
            <div className="flex flex-col gap-3">
              {snippets.map((s, i) => (
                <div key={i}>
                  <p className="text-[13px] text-[#212121] font-medium leading-[20px] mb-0.5">
                    {i + 1}. {s.name}
                  </p>
                  <p className="text-[13px] text-[#555] leading-[20px]">{s.snippet}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[#888] leading-[20px] italic">
              No {platform} data available for this topic.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function CitationBarChart({ competitors, youCitations, themeLabel, llmSummary, prompt0 }: CitationBarChartProps) {
  const [activePlatform, setActivePlatform] = useState<Platform>('ChatGPT')
  const [summaryOpen, setSummaryOpen] = useState(false)

  const sorted = [...competitors].sort((a, b) => b.totalCitations - a.totalCitations)

  // Convert raw citation counts → percentages
  const rawValues = sorted.map(c => c.citedBy.includes(activePlatform) ? c.totalCitations : 0)
  const total = rawValues.reduce((s, v) => s + v, 0) + youCitations
  const toPercent = (v: number) => total > 0 ? Math.round((v / total) * 100) : 0

  const categories = [...sorted.map(c => c.name), 'You']
  const data: Highcharts.PointOptionsObject[] = [
    ...sorted.map(c => ({
      y: toPercent(c.citedBy.includes(activePlatform) ? c.totalCitations : 0),
      color: '#1976d2',
    })),
    { y: toPercent(youCitations), color: '#0F7195' },
  ]

  const options: Highcharts.Options = {
    chart: {
      type: 'bar',
      height: Math.max(200, categories.length * 44 + 60),
      margin: [10, 60, 36, 150],
      backgroundColor: 'transparent',
      style: { fontFamily: 'Roboto, sans-serif' },
    },
    title: { text: '' },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      categories,
      lineWidth: 0,
      tickLength: 0,
      labels: {
        style: { fontSize: '12px', color: '#555' },
        align: 'right',
      },
    },
    yAxis: {
      min: 0,
      max: 100,
      title: { text: '' },
      gridLineWidth: 0,          // no vertical grid lines
      lineWidth: 0,
      labels: {
        format: '{value}%',      // percentage labels at bottom
        style: { fontSize: '11px', color: '#888' },
      },
      tickAmount: 6,
    },
    plotOptions: {
      bar: {
        borderRadius: 3,
        pointPadding: 0.1,
        groupPadding: 0.15,
        dataLabels: {
          enabled: true,
          format: '{y}%',        // percentage on each bar
          style: { fontSize: '11px', color: '#555', fontWeight: 'normal', textOutline: 'none' },
          align: 'left',
          inside: false,
          x: 4,
        },
      },
    },
    series: [{ type: 'bar', name: 'Citations', data }],
    tooltip: {
      formatter(this: Highcharts.TooltipFormatterContextObject) {
        return `<b>${this.key}</b><br/>Citations share: <b>${this.y}%</b>`
      },
    },
  }

  const dropdownLabel = prompt0
    ? `What answers do AI sites generate when someone asks an AI "${prompt0}"`
    : 'What answers do AI sites generate for this topic'

  return (
    <div className="bg-white rounded-lg p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-[16px] font-normal text-[#212121] leading-[24px]">
            How are you cited vs your competitors for <span className="font-semibold">{themeLabel}</span>
          </p>
          <p className="text-[13px] text-[#888] leading-[20px] mt-1">
            Analyze how you are cited in the answers generated by AI sites whenever someone asks about {themeLabel}
          </p>
        </div>
        <CardActions />
      </div>

      {/* Platform filter tabs */}
      <div className="flex gap-0 border-b border-[#eaeaea] mt-5 mb-4">
        {PLATFORMS.map(p => (
          <button
            key={p}
            onClick={() => setActivePlatform(p)}
            className={`px-4 py-2.5 text-[14px] border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activePlatform === p
                ? 'text-[#1976d2] border-[#1976d2]'
                : 'text-[#555] border-transparent hover:text-[#212121]'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Highcharts horizontal bar — no grid lines, percentage labels */}
      <HighchartsReact highcharts={Highcharts} options={options} />

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-1 mb-1">
        <span className="w-2.5 h-2.5 rounded-full bg-[#1976d2] flex-shrink-0" />
        <span className="text-[13px] text-[#555] leading-[20px]">Citations share</span>
      </div>

      {/* Collapsible — dropdown with real LLM response */}
      <div className="border-t border-[#eaeaea] mt-3">
        <button
          onClick={() => setSummaryOpen(v => !v)}
          className="w-full flex items-start justify-between py-3 text-left"
        >
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-[14px] text-[#212121] leading-[22px] font-normal">
              {dropdownLabel}
            </p>
            {!summaryOpen && (
              <p className="text-[12px] text-[#888] leading-[18px] mt-0.5 line-clamp-1">
                Analyze what answers do AI sites generate when someone asks an AI "{prompt0 ?? 'this topic'}"
              </p>
            )}
          </div>
          <img
            src={`${BASE}assets/chevron_down.svg`}
            alt=""
            className={`w-5 h-5 flex-shrink-0 mt-0.5 transition-transform duration-200 ${summaryOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {summaryOpen && (
          <ChatGPTResponsePanel
            prompt={prompt0 ?? 'What do AI sites say about this topic?'}
            competitors={competitors}
            platform={activePlatform}
          />
        )}
      </div>
    </div>
  )
}

// ── Competitor comparison table ───────────────────────────────────────────────
interface CompetitorTableProps {
  insights: string[]
  competitors: { name: string }[]
}

function CompetitorTable({ insights, competitors }: CompetitorTableProps) {
  if (!insights.length || !competitors.length) return null
  const cols = competitors.slice(0, 3)

  return (
    <div className="bg-white border border-[#eaeaea] rounded-lg p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-normal text-[#212121] leading-[22px] tracking-[-0.28px]">
            Why your competitors are winning
          </p>
          <p className="text-[12px] text-[#888] leading-[18px] mt-0.5">
            We analyzed the {cols.length} top-cited competitor{cols.length !== 1 ? 's' : ''} and AEO content score for cited pages. Here's what they have that you don't
          </p>
        </div>
        <CardActions />
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-[13px] min-w-[500px]">
          <thead>
            <tr className="bg-[#fafafa] border-b border-[#eaeaea]">
              <th className="text-left px-5 py-2.5 text-[12px] text-[#555] font-normal leading-[18px] w-[40%]">
                Opportunities
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline ml-1 mb-0.5">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </th>
              {cols.map(c => (
                <th key={c.name} className="text-center px-3 py-2.5 text-[12px] text-[#555] font-normal leading-[18px]">
                  <div className="flex items-center justify-center gap-1">
                    <span className="truncate max-w-[80px]">{c.name}</span>
                    <img src={`${BASE}assets/info.svg`} alt="" className="w-4 h-4 flex-shrink-0 opacity-60" />
                  </div>
                </th>
              ))}
              <th className="text-center px-3 py-2.5">
                <div className="flex items-center justify-center">
                  <img src={`${BASE}assets/you.svg`} alt="You" className="h-[19px]" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {insights.map((insight, i) => (
              <tr key={i} className="border-b border-[#eaeaea] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                <td className="px-5 py-3 text-[13px] text-[#212121] leading-[20px]">{insight}</td>
                {cols.map(c => (
                  <td key={c.name} className="text-center px-3 py-3">
                    <img src={`${BASE}assets/check_circle.svg`} alt="Yes" className="w-4 h-4 inline-block" />
                  </td>
                ))}
                <td className="text-center px-3 py-3">
                  <img src={`${BASE}assets/cancel.svg`} alt="No" className="w-4 h-4 inline-block" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const SECTION_IDS = ['rationale', 'competitor-analysis', 'implementation'] as const
const SECTION_LABELS = ['Rationale', 'Competitor analysis', 'Implementation']

export default function TaskDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { recommendations, completeRec, metrics } = useAppStore()

  const rec = recommendations.find(r => r.id === id)

  // Section refs for scroll-spy
  const sectionRefs = useRef<(HTMLElement | null)[]>([null, null, null])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState(0)

  // Location hover
  const [showLocHover, setShowLocHover]   = useState(false)
  const [locPopoverPos, setLocPopoverPos] = useState({ top: 0, left: 0 })
  const locMoreRef                        = useRef<HTMLSpanElement>(null)

  // Scroll-spy via IntersectionObserver
  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const idx = SECTION_IDS.indexOf(entry.target.id as typeof SECTION_IDS[number])
        if (idx !== -1) setActiveSection(idx)
      }
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersect, {
      root: scrollContainerRef.current,
      threshold: 0.3,
    })
    sectionRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [handleIntersect, rec])

  if (!rec) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-[#555]">
        <p className="text-[16px]">Recommendation not found</p>
        <button onClick={() => navigate('/recommendations')} className="text-[#1976d2] text-[14px] hover:underline">
          ← Back to recommendations
        </button>
      </div>
    )
  }

  const themeConfig   = nsaThemesConfig[rec.themeId]
  const locationCount = rec.locations ?? 1
  const locations     = getLocationsForRec(rec.id, locationCount)
  const firstLocation = locations[0] ?? 'Dubbo, NSW 2830'
  const extraLocs     = locationCount - 1

  const handleLocEnter = () => {
    if (locMoreRef.current) {
      const rect = locMoreRef.current.getBoundingClientRect()
      setLocPopoverPos({ top: rect.bottom + 6, left: rect.left })
    }
    setShowLocHover(true)
  }

  const scrollToSection = (idx: number) => {
    const el = sectionRefs.current[idx]
    if (el && scrollContainerRef.current) {
      // offset for sticky sub-nav height (~45px)
      const top = el.offsetTop - 45
      scrollContainerRef.current.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* ── Sticky sub-nav ───────────────────────────────────────────────── */}
      <nav className="flex flex-shrink-0 border-b border-[#eaeaea] bg-white px-6">
        {SECTION_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => scrollToSection(i)}
            className={`px-4 py-3 text-[14px] border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activeSection === i
                ? 'text-[#1976d2] border-[#1976d2]'
                : 'text-[#555] border-transparent hover:text-[#212121]'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ── Scrollable content ───────────────────────────────────────────── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-[#fafafa]">
        <div className="px-6 py-5 flex flex-col gap-5">

          {/* ══════════════════════════════════════════════════════════
              SECTION 1 — Rationale
          ══════════════════════════════════════════════════════════ */}
          <section id="rationale" ref={el => { sectionRefs.current[0] = el }}>
            <div className="flex flex-col gap-4">

              {/* ── Card 1: Summary header + blog preview ── */}
              <div className="bg-white rounded-lg overflow-hidden">

                {/* Chips + location row */}
                <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category pill — purple */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[12px] leading-[18px] font-normal" style={{ backgroundColor: '#EDE9FE', color: '#6834B7' }}>
                      {rec.category}
                    </span>
                    {/* Quick wins — no pill, green bolt + grey text */}
                    {rec.effort === 'Quick win' && (
                      <span className="inline-flex items-center gap-1 text-[12px] leading-[18px] font-normal text-[#555]">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="#4CAF50" className="flex-shrink-0">
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                        </svg>
                        Quick wins
                      </span>
                    )}
                    {/* Bigger lift */}
                    {rec.effort === 'Bigger lift' && (
                      <span className="inline-flex items-center gap-1 text-[12px] leading-[18px] font-normal text-[#c65c04]">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                          <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 4 12.74V17H8v-2.26A7 7 0 0 1 12 2z"/>
                        </svg>
                        Bigger lift
                      </span>
                    )}
                  </div>
                  {/* Location count — right aligned */}
                  <div className="flex items-center gap-1 text-[12px] text-[#555] flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span
                      ref={locMoreRef}
                      className="cursor-pointer hover:underline whitespace-nowrap"
                      onMouseEnter={handleLocEnter}
                      onMouseLeave={() => setShowLocHover(false)}
                    >
                      {locationCount} location{locationCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <p className="text-[15px] text-[#212121] leading-[23px] font-normal px-4 pt-3 pb-0">
                  {rec.title}
                </p>

                {/* Description */}
                <p className="text-[13px] text-[#555] leading-[21px] px-4 pt-2 pb-4">
                  {rec.description}
                </p>

                {/* Blog preview — light purple, full-width within card */}
                <div className="mx-4 mb-4 rounded-lg overflow-hidden" style={{ backgroundColor: '#F5F3FF' }}>
                  {/* Label row */}
                  <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                    <img src={`${BASE}assets/ai-agent.svg`} alt="" className="w-3 h-3 flex-shrink-0" />
                    <span className="text-[13px] text-[#212121] leading-[20px]">
                      Publish this blog to increase your citation score
                    </span>
                  </div>
                  {/* Blog content row */}
                  <div className="flex items-start gap-3 px-4 pb-4">
                    <img
                      src={`${BASE}assets/Frame 2147224172.png`}
                      alt="Blog thumbnail"
                      className="w-[61px] h-[61px] object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#212121] leading-[20px]">
                        {rec.title}{' '}
                        <a href="#" className="text-[#1976d2] hover:underline whitespace-nowrap">View blog</a>
                      </p>
                      <p className="text-[12px] text-[#555] leading-[18px] mt-1">
                        {rec.description.length > 120
                          ? rec.description.slice(0, 120) + '... '
                          : rec.description + '... '}
                        <a href="#" className="text-[#1976d2] hover:underline">view blog</a>
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* ── Card 2: Why does this matter — separate card ── */}
              {rec.whyItWorks.length > 0 && (
                <div className="bg-white rounded-lg px-5 py-5">
                  <p className="text-[14px] font-normal text-[#212121] leading-[22px] mb-0.5">
                    Why does this matter to you
                  </p>
                  <p className="text-[12px] text-[#888] leading-[18px] mb-3">
                    Step by step guide on what you need to do next
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {rec.whyItWorks.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#212121] leading-[21px]">
                        <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-[#555] flex-shrink-0" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════
              SECTION 2 — Competitor analysis
          ══════════════════════════════════════════════════════════ */}
          <section id="competitor-analysis" ref={el => { sectionRefs.current[1] = el }}>
            <div className="flex flex-col gap-5">

              {/* Citation bar chart */}
              {rec.competitors.length > 0 && (
                <CitationBarChart
                  competitors={rec.competitors}
                  youCitations={rec.youCitations ?? metrics.youCitations}
                  themeLabel={themeConfig?.label ?? rec.category}
                  llmSummary={rec.llmCoverageGap.summary}
                  prompt0={themeConfig?.prompts[0]}
                />
              )}

              {/* Competitor comparison table */}
              <CompetitorTable
                insights={rec.competitorsInsight ?? []}
                competitors={rec.competitors}
              />
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════
              SECTION 3 — Implementation
          ══════════════════════════════════════════════════════════ */}
          <section id="implementation" ref={el => { sectionRefs.current[2] = el }}>
            <div className="bg-white border border-[#eaeaea] rounded-lg">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <p className="text-[14px] font-normal text-[#212121] leading-[22px] tracking-[-0.28px]">
                  What to do next
                </p>
                <CardActions />
              </div>

              {/* Stepper */}
              <div className="pb-2">
                {rec.checklist.map((step, idx) => {
                  const isLast = idx === rec.checklist.length - 1
                  return (
                    <div key={step.id} className="flex gap-3 items-stretch px-5">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-5 h-5 border border-[#eaeaea] rounded-full flex items-center justify-center text-[11px] text-[#555] leading-none flex-shrink-0 bg-white mt-0.5">
                          {idx + 1}
                        </div>
                        {!isLast && <div className="w-px flex-1 bg-[#eaeaea] mt-1" />}
                      </div>
                      <div className={`flex flex-col flex-1 min-w-0 pt-0.5 ${!isLast ? 'pb-5' : 'pb-1'}`}>
                        <p className="text-[14px] text-[#212121] leading-[22px] tracking-[-0.28px]">
                          {step.label}
                        </p>
                        <p className="text-[13px] text-[#555] leading-[20px] mt-0.5">{step.description}</p>
                        <StepRichBox step={step} />
                        {isLast && rec.status !== 'pending' && (
                          <div className="mt-3">
                            <button
                              onClick={() => completeRec(rec.id)}
                              disabled={rec.status === 'completed'}
                              className={`h-8 px-4 text-[13px] rounded transition-colors ${
                                rec.status === 'completed'
                                  ? 'bg-[#f0faf0] text-[#377e2c] border border-[#377e2c]/30 cursor-default'
                                  : 'bg-[#1976d2] text-white hover:bg-[#1565c0] cursor-pointer'
                              }`}
                            >
                              {rec.status === 'completed' ? '✓ Completed' : 'Mark as complete'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Implement for me banner */}
              <div className="flex items-center justify-between gap-3 mx-5 mb-5 mt-1 px-4 py-3 bg-[#f5f0ff] rounded-lg border border-[#e4d9f9]">
                <div className="flex items-center gap-2 min-w-0">
                  <img src={`${BASE}assets/ai-agent.svg`} alt="" className="w-3 h-3 flex-shrink-0" />
                  <span className="text-[13px] text-[#555] leading-[20px]">
                    Need help with implementation? Opt in for managed services and our team will make the updates for you on your website
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* bottom padding */}
          <div className="h-4 flex-shrink-0" />
        </div>
      </div>

      {/* Location hover popover — portal */}
      {showLocHover && createPortal(
        <div
          className="fixed z-[9999] bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[#eaeaea] w-56 py-2"
          style={{ top: locPopoverPos.top, left: locPopoverPos.left }}
          onMouseEnter={() => setShowLocHover(true)}
          onMouseLeave={() => setShowLocHover(false)}
        >
          <p className="px-3 pt-1 pb-2 text-[11px] text-[#888] font-medium tracking-[0.4px] uppercase">
            Locations covered
          </p>
          <ul className="max-h-52 overflow-y-auto">
            {locations.map(loc => (
              <li key={loc} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f5f5f5]">
                <PinIcon />
                <span className="text-[13px] text-[#212121] leading-[18px]">{loc}</span>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  )
}
