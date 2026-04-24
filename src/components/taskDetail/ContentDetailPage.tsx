import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Recommendation } from '../../types'
import type { BusinessMetrics } from '../../types'
import { nsaThemesConfig } from '../../data/nsaThemesConfig'
import { getLocationsForRec } from '../../data/locationsData'
import { useAppStore } from '../../store/useAppStore'

const BASE = import.meta.env.BASE_URL

// ── Helpers ───────────────────────────────────────────────────────────────────
function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
      <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function ChevronDown({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ── AEO score box — bordered card with donut + number outside ring (Figma 430-3838) ──
function AeoScoreBox({ score }: { score: number }) {
  const r    = 8
  const circ = 2 * Math.PI * r
  const pct  = Math.min(score, 100) / 100
  return (
    <div className="border border-[#eaeaea] rounded p-3 flex flex-col gap-[10px] items-start flex-shrink-0">
      <p className="text-[12px] text-[#212121] leading-[normal] whitespace-nowrap font-normal">
        AEO content score
      </p>
      <div className="flex items-center gap-2">
        {/* Small donut — fill starts from top (rotated 270°) */}
        <svg width="20" height="20" viewBox="0 0 20 20" style={{ transform: 'rotate(270deg)' }} className="flex-shrink-0">
          <circle cx="10" cy="10" r={r} fill="none" stroke="#eaeaea" strokeWidth="2.5" />
          <circle
            cx="10" cy="10" r={r} fill="none"
            stroke="#4CAE3D" strokeWidth="2.5"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round"
          />
        </svg>
        {/* Number sits OUTSIDE the ring, to the right */}
        <span className="text-[16px] text-[#377e2c] leading-[24px] tracking-[-0.32px] font-normal">{score}</span>
        <span className="text-[14px] text-[#8f8f8f] leading-[20px] font-normal">/100</span>
      </div>
    </div>
  )
}

// ── Blog preview modal (Figma 368-28583) ─────────────────────────────────────
interface BlogPreviewModalProps {
  open: boolean
  onClose: () => void
  aeoScore: number
  title: string
  imageUrl: string
  intro: string
  blogUrl?: string
}
function BlogPreviewModal({ open, onClose, aeoScore, title, imageUrl, intro }: BlogPreviewModalProps) {
  if (!open) return null
  const r    = 8
  const circ = 2 * Math.PI * r
  const pct  = Math.min(aeoScore, 100) / 100

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto">
      {/* Dark blanket overlay */}
      <div className="fixed inset-0 bg-[rgba(33,33,33,0.64)]" onClick={onClose} />

      {/* Modal panel */}
      <div
        className="relative bg-white rounded shadow-[0px_4px_8px_0px_rgba(33,33,33,0.18)] w-[1200px] max-w-[calc(100vw-48px)] flex flex-col mt-12 mb-12"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#eaeaea] flex items-center justify-between px-6 py-4 flex-shrink-0">
          <p className="text-[16px] text-[#1f2328] leading-[24px] font-normal">Blog</p>

          <div className="flex items-center gap-3">
            {/* AEO content score */}
            <div className="flex items-center gap-1">
              <p className="text-[16px] text-[#555] leading-[24px] tracking-[-0.32px] font-normal">
                AEO content score
              </p>
              <div className="flex items-center gap-1 px-2 py-1">
                <svg width="20" height="20" viewBox="0 0 20 20" style={{ transform: 'rotate(270deg)' }} className="flex-shrink-0">
                  <circle cx="10" cy="10" r={r} fill="none" stroke="#eaeaea" strokeWidth="2.5" />
                  <circle cx="10" cy="10" r={r} fill="none" stroke="#4CAE3D" strokeWidth="2.5"
                    strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" />
                </svg>
                <span className="text-[16px] text-[#377e2c] leading-[24px] tracking-[-0.32px] font-normal">{aeoScore}</span>
                <span className="text-[14px] text-[#8f8f8f] leading-[20px] font-normal">/100</span>
              </div>
            </div>

            {/* Edit blog */}
            <button className="h-9 px-4 bg-[#1976d2] text-white text-[14px] leading-[20px] rounded hover:bg-[#1565c0] transition-colors whitespace-nowrap">
              Edit blog
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#f5f5f5] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto px-[65px] py-10">
          <div className="flex flex-col gap-8 max-w-[1070px] mx-auto">

            {/* Title + intro + hero image */}
            <div className="flex flex-col gap-2">
              <p className="text-[24px] font-medium text-[#212121] leading-[36px] tracking-[-0.48px]">
                {title}
              </p>
              <p className="text-[14px] text-[#212121] leading-[20px]">
                {intro}
              </p>
              <div className="w-full h-[392px] rounded-lg overflow-hidden mt-1">
                <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Section 1 */}
            <div className="flex flex-col gap-2">
              <p className="text-[18px] font-medium text-[#212121] leading-[26px] tracking-[-0.36px]">
                Understanding the Australian Property Market
              </p>
              <div className="flex flex-col gap-[25px] text-[14px] text-[#212121] leading-[20px]">
                <p>Selling property in Australia involves navigating a dynamic market that varies significantly by state and territory. Understanding current market conditions, local demand, and seasonal trends is essential for achieving the best possible outcome for your sale.</p>
                <p>Whether you're in a capital city or regional area, working with a licensed real estate agent who knows your local market can make a significant difference. They bring expertise in pricing strategy, marketing, and negotiation that helps maximise your property's value.</p>
                <p>It's also important to understand your legal obligations as a vendor. Each state has specific requirements around disclosure, contracts, and settlement that must be followed carefully.</p>
                <p>Being well-prepared before listing your property — from presentation and repairs to gathering necessary documentation — can help you avoid delays and achieve a smoother sale process.</p>
              </div>
            </div>

            {/* Section 2 */}
            <div className="flex flex-col gap-2">
              <p className="text-[18px] font-medium text-[#212121] leading-[26px] tracking-[-0.36px]">
                Preparing Your Property for Sale
              </p>
              <div className="flex flex-col gap-[25px] text-[14px] text-[#212121] leading-[20px]">
                <p>First impressions matter enormously in real estate. Buyers form opinions within seconds of arriving at a property, so investing in presentation — including decluttering, cleaning, painting, and landscaping — can deliver significant returns on your sale price.</p>
                <p>Consider engaging a professional property stylist or photographer to present your home in the best possible light. High-quality marketing materials, including professional photos and a compelling listing description, help your property stand out in a competitive market.</p>
              </div>
              <div className="w-full h-[435px] rounded-lg overflow-hidden mt-2">
                <img src={imageUrl} alt="Property preparation" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Section 3 */}
            <div className="flex flex-col gap-2">
              <p className="text-[18px] font-medium text-[#212121] leading-[26px] tracking-[-0.36px]">
                Ready to Sell Your Property?
              </p>
              <p className="text-[14px] text-[#212121] leading-[20px]">
                Selling property in Australia is a significant decision that requires careful planning and expert guidance. From setting the right price to choosing between auction and private sale, every decision affects your outcome.
              </p>
              <p className="text-[14px] text-[#212121] leading-[20px] mt-[25px]">
                If you're considering selling, speak with a qualified local agent who can provide a property appraisal and guide you through the process from listing to settlement. A well-informed approach gives you the best chance of achieving your goals.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Blog preview inner box (Figma 430-3838) ───────────────────────────────────
interface BlogPreviewBoxProps {
  rec: Recommendation
  aeoScore: number
  /** Override blog title shown inside the preview */
  title?: string
  /** Override description text shown inside the preview */
  body?: string
  /** Override thumbnail image src */
  imageUrl?: string
  /** Override "View blog" href */
  blogUrl?: string
}
function BlogPreviewBox({ rec, aeoScore, title, body, imageUrl, blogUrl }: BlogPreviewBoxProps) {
  const [showModal, setShowModal] = useState(false)

  const displayTitle = title ?? rec.title
  const rawBody      = body ?? rec.description
  const displayBody  = rawBody.length > 120 ? rawBody.slice(0, 120) + '...' : rawBody
  const displayImg   = imageUrl ?? `${BASE}assets/Frame 2147224172.png`
  const displayHref  = blogUrl ?? '#'

  return (
    <>
      <div className="flex items-start gap-3 bg-[#f9f7fd] rounded-lg p-3">
        {/* Left: image + text content — click opens modal */}
        <button
          className="flex flex-1 gap-3 items-start min-w-0 text-left cursor-pointer"
          onClick={() => setShowModal(true)}
        >
          <img
            src={displayImg}
            alt="Blog thumbnail"
            className="w-[60px] h-[60px] object-cover rounded-lg flex-shrink-0"
          />
          <div className="flex-1 min-w-0 flex flex-col gap-0.5 justify-center">
            <div className="flex items-center gap-1">
              <img src={`${BASE}assets/ai-agent.svg`} alt="" className="w-3 h-3 flex-shrink-0" />
              <span className="text-[12px] leading-[18px] tracking-[-0.24px]" style={{ color: '#6834B7' }}>
                Blog generated for you
              </span>
            </div>
            <p className="text-[14px] text-[#212121] leading-[20px] tracking-[-0.28px] font-normal">
              {displayTitle}
            </p>
            <p className="text-[14px] text-[#555] leading-[20px] tracking-[-0.28px]">
              {displayBody}{' '}
              <a
                href={displayHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#1976d2] hover:underline"
                onClick={e => e.stopPropagation()}
              >
                View blog
              </a>
            </p>
          </div>
        </button>
        {/* Right: AEO score box */}
        <AeoScoreBox score={aeoScore} />
      </div>

      {/* Blog preview modal */}
      <BlogPreviewModal
        open={showModal}
        onClose={() => setShowModal(false)}
        aeoScore={aeoScore}
        title={displayTitle}
        intro={rawBody}
        imageUrl={displayImg}
        blogUrl={displayHref}
      />
    </>
  )
}

// ── Card shell with export/more buttons ──────────────────────────────────────
function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-[#212121] leading-[22px] font-normal">{title}</p>
        {subtitle && (
          <p className="text-[12px] text-[#888] leading-[18px] mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f5f5f5] transition-colors">
          <img src={`${BASE}assets/more_vert.svg`} alt="export" className="w-4 h-4 opacity-60" />
        </button>
        <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f5f5f5] transition-colors">
          <img src={`${BASE}assets/dot-3.svg`} alt="more" className="w-4 h-4 opacity-60" />
        </button>
      </div>
    </div>
  )
}

// ── Location tags ─────────────────────────────────────────────────────────────
function LocationTags({ locations }: { locations: string[] }) {
  const first = locations[0]
  if (!first) return null
  return (
    <div className="flex items-center gap-2 mt-3 flex-wrap">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#f5f5f5] rounded text-[11px] text-[#555] leading-[18px]">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        Blog
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#f5f5f5] rounded text-[11px] text-[#555] leading-[18px]">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        {first}
      </span>
    </div>
  )
}

// ── Category → metric mapping ─────────────────────────────────────────────────
type MetricsKey = 'citationShare' | 'visibility' | 'sentiment'

function getMetricForCategory(category: string): { label: string; key: MetricsKey } {
  if (['Content', 'Website content', 'FAQ', 'Social'].includes(category)) {
    return { label: 'Citation share', key: 'citationShare' }
  }
  if (['Local SEO', 'Technical SEO', 'Website improvement', 'Conversion'].includes(category)) {
    return { label: 'Visibility score', key: 'visibility' }
  }
  // Trust & Reputation, Reviews — default
  return { label: 'Sentiment score', key: 'sentiment' }
}

// ── Score progress bar card (right column) ────────────────────────────────────
function ScoreCard({ rec, metrics }: { rec: Recommendation; metrics: BusinessMetrics }) {
  const themeConfig  = nsaThemesConfig[rec.themeId]
  const label        = themeConfig?.label ?? rec.category
  const { label: metricLabel, key: metricsKey } = getMetricForCategory(rec.category)
  const current      = metrics[metricsKey]
  // competitor average from top competitors totalCitations (rough proxy → normalised)
  const compTotal    = rec.competitors.reduce((s, c) => s + c.totalCitations, 0)
  const avgCitations = rec.competitors.length > 0 ? compTotal / rec.competitors.length : 0
  const maxCitations = rec.competitors[0]?.totalCitations ?? 1
  const compPct      = Math.min((avgCitations / maxCitations) * (current * 1.1), 100)

  // bar widths — your score vs competitor
  const yourW = Math.min(current, 100)
  const compW = Math.min(compPct, 100)

  return (
    <div className="bg-white rounded-lg p-5 flex flex-col gap-3 h-full">
      <p className="text-[14px] text-[#212121] leading-[22px] font-normal">
        What is your {metricLabel} for {label}?
      </p>
      <p className="text-[12px] text-[#888] leading-[18px]">You vs competitor average</p>

      {/* Big numbers */}
      <div className="flex items-end gap-6 mt-1">
        <div>
          <p className="text-[28px] font-normal text-[#212121] leading-none">{current.toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-[28px] font-normal text-[#212121] leading-none">{compPct.toFixed(0)}%</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[11px] text-[#555]">
          <span className="w-2 h-2 rounded-full bg-[#1976d2] flex-shrink-0" />
          Current score
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#555]">
          <span className="w-2 h-2 rounded-full bg-[#e53935] flex-shrink-0" />
          Competitor average
        </span>
      </div>

      {/* Single track with 2 marker dots */}
      <div className="relative h-1.5 bg-[#eaeaea] rounded-full mt-2">
        {/* blue fill up to your score */}
        <div
          className="absolute left-0 top-0 h-full bg-[#1976d2] rounded-full"
          style={{ width: `${yourW}%` }}
        />
        {/* blue dot — current score */}
        <div
          className="absolute top-1/2 w-3 h-3 bg-[#1976d2] rounded-full border-2 border-white shadow-sm"
          style={{ left: `${yourW}%`, transform: 'translate(-50%, -50%)' }}
        />
        {/* red dot — competitor average */}
        <div
          className="absolute top-1/2 w-3 h-3 bg-[#e53935] rounded-full border-2 border-white shadow-sm"
          style={{ left: `${compW}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
    </div>
  )
}

// ── AEO comparison table (collapsible) ────────────────────────────────────────
function AeoComparisonTable({ rec }: { rec: Recommendation }) {
  const [open, setOpen] = useState(true)
  const [bannerOpen, setBannerOpen] = useState(true)
  const aeo  = rec.aeoScore
  const comp = rec.competitors[0]
  if (!aeo || !comp) return null

  return (
    <div className="border border-[#eaeaea] rounded-lg overflow-hidden mt-4">
      {/* Toggle row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-white hover:bg-[#fafafa] transition-colors text-left"
      >
        <ChevronDown className={`text-[#555] flex-shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
        <span className="text-[13px] text-[#212121] leading-[20px] flex-1">
          Compare AEO content score for Search AI generated blog vs competitor's blog
        </span>
      </button>

      {open && (
        <>
          {/* Info banner */}
          {bannerOpen && (
            <div className="flex items-start justify-between gap-3 px-4 py-2.5 bg-[#fafafa] border-t border-[#eaeaea]">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <img src={`${BASE}assets/info.svg`} alt="" className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-60" />
                <p className="text-[12px] text-[#555] leading-[18px]">
                  AEO content score predicts how well your page is likely to perform in answers generated by AI
                </p>
              </div>
              <button
                onClick={() => setBannerOpen(false)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-[#eaeaea] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto border-t border-[#eaeaea]">
            <table className="w-full border-collapse">
              <colgroup>
                <col style={{ width: '44%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr className="bg-[#fafafa] border-b border-[#eaeaea]">
                  <th className="text-left px-4 py-3 text-[12px] text-[#555] font-normal leading-[18px]">
                    <button className="flex items-center gap-1">
                      Score
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </th>
                  <th className="text-center px-4 py-3 text-[12px] text-[#555] font-normal leading-[18px]">
                    <div className="flex items-center justify-center">
                      <img src={`${BASE}assets/you.svg`} alt="You" className="h-[18px]" />
                    </div>
                  </th>
                  <th className="text-center px-4 py-3 text-[12px] text-[#555] font-normal leading-[18px]">
                    <div className="flex items-center justify-center gap-1">
                      Potential impact
                      <img src={`${BASE}assets/info.svg`} alt="" className="w-3.5 h-3.5 opacity-60" />
                    </div>
                  </th>
                  <th className="text-center px-4 py-3 text-[12px] text-[#555] font-normal leading-[18px]">
                    <div className="flex items-center justify-center gap-1">
                      <span className="truncate max-w-[80px]">{comp.name}</span>
                      <img src={`${BASE}assets/info.svg`} alt="" className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Total row */}
                <tr className="border-b border-[#eaeaea] hover:bg-[#fafafa]">
                  <td className="px-4 py-3">
                    <button className="flex items-center gap-1 text-[13px] text-[#212121] leading-[20px]">
                      <ChevronDown className="w-3.5 h-3.5 text-[#888]" />
                      AEO content score
                    </button>
                  </td>
                  <td className="text-center px-4 py-3 text-[13px] text-[#212121] font-medium">{aeo.you}%</td>
                  <td className="text-center px-4 py-3">
                    <DeltaTag delta={aeo.you - aeo.competitor} />
                  </td>
                  <td className="text-center px-4 py-3 text-[13px] text-[#212121]">{aeo.competitor}%</td>
                </tr>
                {/* Sub-score rows */}
                {aeo.subScores.map((row, i) => (
                  <tr key={i} className="border-b border-[#eaeaea] last:border-b-0 hover:bg-[#fafafa]">
                    <td className="px-4 py-3">
                      <p className="text-[13px] text-[#212121] leading-[20px]">{row.name}</p>
                      <p className="text-[11px] text-[#888] leading-[16px]">Weights: {row.weight}</p>
                    </td>
                    <td className="text-center px-4 py-3 text-[13px] text-[#212121]">{row.you}%</td>
                    <td className="text-center px-4 py-3">
                      <DeltaTag delta={row.delta} />
                    </td>
                    <td className="text-center px-4 py-3 text-[13px] text-[#212121]">{row.competitor}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function DeltaTag({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-[12px] text-[#888]">—</span>
  const positive = delta > 0
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] leading-[16px] font-medium ${
        positive ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#fbe9e7] text-[#c62828]'
      }`}
    >
      {positive ? '+' : ''}{delta}%
    </span>
  )
}

// ── Main Content detail layout ────────────────────────────────────────────────
export default function ContentDetailPage() {
  const { recommendations, metrics } = useAppStore()
  // rec is guaranteed to be Content type — passed via TaskDetailPage routing
  // We get it from window location
  const id = window.location.pathname.split('/').pop()
  const rec = recommendations.find(r => r.id === id)

  // Location hover popover state (portal kept for future use)
  const [showLocHover, setShowLocHover] = useState(false)
  const [locPopoverPos]                 = useState({ top: 0, left: 0 })

  if (!rec) return null

  const themeConfig    = nsaThemesConfig[rec.themeId]
  const locationCount  = rec.locations ?? 1
  const locations      = getLocationsForRec(rec.id, locationCount)
  const firstLocation  = locations[0] ?? ''
  const topComp        = rec.competitors[0]
  const themePrompt    = themeConfig?.prompts?.[0] ?? rec.category

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa]">
      <div className="px-6 py-5 flex flex-col gap-4">

        {/* ═══ ROW 1: Why it matters (left) + Score card (right) ═══════════ */}
        <div className="flex gap-4 items-stretch">

          {/* Left: Why does this matter */}
          {rec.whyItWorks.length > 0 && (
            <div className="flex-1 bg-white rounded-lg p-5 min-w-0">
              <p className="text-[14px] text-[#212121] leading-[22px] font-normal mb-0.5">
                Why does this recommendation matter to you
              </p>
              <p className="text-[12px] text-[#888] leading-[18px] mb-3">
                We analyzed your reports and found these gaps
              </p>
              <ul className="flex flex-col gap-2.5">
                {rec.whyItWorks.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#212121] leading-[21px]">
                    <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-[#555] flex-shrink-0" />
                    {pt}
                  </li>
                ))}
                {topComp && (
                  <li className="flex items-start gap-2.5 text-[13px] text-[#212121] leading-[21px]">
                    <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-[#555] flex-shrink-0" />
                    {topComp.name} is the top cited competitor for {themeConfig?.label ?? rec.category}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Right: Score card */}
          <div className="w-[30%] flex-shrink-0">
            <ScoreCard rec={rec} metrics={metrics} />
          </div>
        </div>

        {/* ═══ CARD 2: Generated blog preview ══════════════════════════════ */}
        <div className="bg-white rounded-lg p-5">
          <CardHeader
            title={`Create a new blog titled 'Selling Property in Australia: A Comprehensive Guide'`}
            subtitle={rec.description}
          />
          <BlogPreviewBox
            rec={rec}
            aeoScore={rec.aeoScore?.you ?? 95}
            title="Selling Property in Australia: A Comprehensive Guide"
            body="This in-depth article explores the multifaceted process of selling property in Australia, catering to diverse needs and situations."
            imageUrl="https://downunderrealty.com/wp-content/uploads/2024/12/selling-property-in-australia-a-comprehensive-guide-1733976115.png"
            blogUrl="https://downunderrealty.com/real-estate/selling-property-in-australia-comprehensive-guide-2/"
          />
          <LocationTags locations={[firstLocation]} />
        </div>


        {/* ═══ CARD 4: What to do next (stepper) ══════════════════════════ */}
        <div className="bg-white rounded-lg">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <p className="text-[14px] text-[#212121] leading-[22px] font-normal">What to do next</p>
              <p className="text-[12px] text-[#888] leading-[18px] mt-0.5">Step by step guide on what you need to do next</p>
            </div>
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f5f5f5]">
                <img src={`${BASE}assets/more_vert.svg`} alt="" className="w-4 h-4 opacity-60" />
              </button>
              <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f5f5f5]">
                <img src={`${BASE}assets/dot-3.svg`} alt="" className="w-4 h-4 opacity-60" />
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="pb-2">
            {rec.checklist.map((step, idx) => {
              const isLast  = idx === rec.checklist.length - 1
              const isFirst = idx === 0
              return (
                <div key={step.id} className="flex gap-3 items-stretch px-5">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-5 h-5 border border-[#1976d2] rounded-full flex items-center justify-center text-[11px] text-[#1976d2] leading-none flex-shrink-0 bg-white mt-0.5">
                      {idx + 1}
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-[#eaeaea] mt-1" />}
                  </div>
                  <div className={`flex flex-col flex-1 min-w-0 pt-0.5 ${!isLast ? 'pb-5' : 'pb-1'}`}>
                    <p className="text-[14px] text-[#212121] leading-[22px]">{step.label}</p>
                    <p className="text-[13px] text-[#555] leading-[20px] mt-0.5">{step.description}</p>
                    {/* First step gets embedded blog preview */}
                    {isFirst && (
                      <div className="mt-3">
                        <BlogPreviewBox rec={rec} aeoScore={rec.aeoScore?.you ?? 95} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Implement for me banner */}
          <div className="flex items-center justify-between gap-3 mx-5 mb-5 mt-2 px-4 py-3 bg-[#f5f0ff] rounded-lg border border-[#e4d9f9]">
            <div className="flex items-center gap-2 min-w-0">
              <img src={`${BASE}assets/ai-agent.svg`} alt="" className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[12px] text-[#555] leading-[18px]">
                Need help with implementation? Opt in for manage services and our team will make the updates for you on your website
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button className="h-7 px-3 bg-[#1976d2] text-white text-[12px] rounded hover:bg-[#1565c0] transition-colors whitespace-nowrap">
                Implement for me
              </button>
              <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#e4d9f9] transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ═══ CARD 5: Competitor blog cited by AI ════════════════════════ */}
        {topComp && (
          <div className="bg-white rounded-lg p-5">
            <CardHeader
              title={`What top competitor blog is cited by AI for '${themePrompt}'`}
              subtitle="Analyze why competitors blog is getting cited instead of you"
            />

            {/* Competitor preview row */}
            <div className="flex items-start gap-3 bg-[#fafafa] rounded-lg px-4 py-3">
              <div className="flex-1 min-w-0">
                {/* Competitor name badge */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-base">🟡</span>
                  <span className="text-[13px] font-medium text-[#212121]">{topComp.name}</span>
                </div>
                {/* Competitor page title */}
                <a
                  href={topComp.pageUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-[#1976d2] hover:underline leading-[20px] block mb-1"
                >
                  {topComp.pageUrl
                    ? topComp.pageUrl.replace(/https?:\/\//, '').replace(/\/$/, '')
                    : `${topComp.name} | Top result`}
                </a>
                {/* Snippet */}
                <p className="text-[12px] text-[#555] leading-[18px] line-clamp-2">
                  {topComp.llmSnippet}
                </p>
              </div>
              {/* AEO score circle */}
              <AeoScoreBox score={rec.aeoScore?.competitor ?? 85} />
            </div>

            {/* AEO comparison table */}
            <AeoComparisonTable rec={rec} />
          </div>
        )}

        {/* bottom padding */}
        <div className="h-4 flex-shrink-0" />
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
