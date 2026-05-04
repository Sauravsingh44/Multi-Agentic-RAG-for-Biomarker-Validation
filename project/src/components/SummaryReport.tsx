import { Download, User, Dna, Pill as PillIcon, ClipboardList, Activity } from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { AnalysisResults } from '../types';
import { getCancerType, SUBTYPE_META, COLOR_STYLES, CANCER_LABELS } from '../types';

interface SummaryReportProps {
  results: AnalysisResults;
}

export default function SummaryReport({ results }: SummaryReportProps) {
  const { summary }  = results;
  const topGenes     = summary.topGenes ?? [];
  const cancerType   = getCancerType(summary.subtype);
  const label        = CANCER_LABELS[cancerType];
  const meta         = SUBTYPE_META[summary.subtype];
  const accent       = COLOR_STYLES[meta?.color ?? 'cyan'];

  const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const renderHighlightedSummary = (text: string, genes: string[]) => {
    const safeText = text || '';
    const terms = [...new Set(genes.filter(Boolean))].sort((a, b) => b.length - a.length);
    if (!terms.length) return safeText;
    const pattern = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi');
    return safeText.split(pattern).map((seg, idx) => {
      const isGene = terms.some((g) => g.toLowerCase() === seg.toLowerCase());
      if (!isGene) return <span key={idx}>{seg}</span>;
      return (
        <span
          key={idx}
          className="px-1 rounded font-semibold"
          style={{ background: `${accent.hex}28`, color: accent.hex }}
        >
          {seg}
        </span>
      );
    });
  };

  const handleDownload = () => {
    const doc          = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth    = doc.internal.pageSize.getWidth();
    const pageHeight   = doc.internal.pageSize.getHeight();
    const margin       = 48;
    const contentWidth = pageWidth - margin * 2;
    let cursorY        = margin;
    const [aR, aG, aB] = label.accentRgb;

    const ensureSpace = (n: number) => {
      if (cursorY + n > pageHeight - margin) { doc.addPage(); cursorY = margin; }
    };

    // Header
    doc.setFillColor(8, 16, 36);
    doc.rect(0, 0, pageWidth, 100, 'F');
    doc.setFillColor(aR, aG, aB);
    doc.rect(0, 0, 5, 100, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(label.footerLabel, margin, 44);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 178, 210);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 64);
    doc.text(`Patient ID: ${summary.patientId}`, margin, 80);
    const confLabel = `${(results.confidence * 100).toFixed(1)}% Confidence`;
    doc.setFillColor(aR, aG, aB);
    doc.roundedRect(pageWidth - margin - 110, 30, 110, 28, 4, 4, 'F');
    doc.setTextColor(8, 16, 36);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(confLabel, pageWidth - margin - 55, 48, { align: 'center' });
    cursorY = 124;

    const addSection = (title: string) => {
      ensureSpace(40);
      doc.setDrawColor(220, 230, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(aR, aG, aB);
      doc.text(title.toUpperCase(), margin, cursorY);
      cursorY += 16;
    };

    const addHighlightedBody = (
      text: string,
      terms: string[],
      size = 9.5,
      color: [number, number, number] = [44, 55, 72]
    ) => {
      const safeText = text?.trim() || 'N/A';
      const sorted   = [...new Set(terms.filter(Boolean))].sort((a, b) => b.length - a.length);
      const lines    = doc.splitTextToSize(safeText, contentWidth);
      const lh       = size * 1.45;
      ensureSpace(lines.length * lh + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size);
      for (const rawLine of lines) {
        const line = String(rawLine);
        const y    = cursorY;
        let x      = margin;
        if (!sorted.length) {
          doc.setTextColor(...color);
          doc.text(line, x, y);
          cursorY += lh;
          continue;
        }
        const pat = new RegExp(`(${sorted.map(escapeRegex).join('|')})`, 'gi');
        let last  = 0;
        let m     = pat.exec(line);
        while (m) {
          const before = line.slice(last, m.index);
          if (before) { doc.setTextColor(...color); doc.text(before, x, y); x += doc.getTextWidth(before); }
          const hw = doc.getTextWidth(m[0]);
          doc.setFillColor(224, 242, 254);
          doc.roundedRect(x - 1.5, y - size + 1.5, hw + 3, size + 4, 2, 2, 'F');
          doc.setTextColor(3, 105, 161);
          doc.text(m[0], x, y);
          x   += hw;
          last = m.index + m[0].length;
          m    = pat.exec(line);
        }
        const tail = line.slice(last);
        if (tail) { doc.setTextColor(...color); doc.text(tail, x, y); }
        cursorY += lh;
      }
      cursorY += 8;
    };

    const addPillRow = (
      items: string[],
      bg: [number, number, number],
      fg: [number, number, number]
    ) => {
      const pillH = 16, gap = 6, pad = 10;
      ensureSpace(pillH + 12);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      let x = margin;
      for (const item of items) {
        const w = doc.getTextWidth(item) + pad * 2;
        if (x + w > pageWidth - margin) { x = margin; cursorY += pillH + gap; ensureSpace(pillH + gap); }
        doc.setFillColor(...bg);
        doc.roundedRect(x, cursorY - 11, w, pillH, 3, 3, 'F');
        doc.setTextColor(...fg);
        doc.text(item, x + pad, cursorY);
        x += w + gap;
      }
      cursorY += pillH + 6;
    };

    addSection('Case Overview');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(44, 55, 72);
    doc.text('Predicted Subtype', margin, cursorY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(8, 16, 36);
    doc.text(summary.subtype, margin, cursorY + 20);
    cursorY += 36;

    addSection('Top Driver Genes');
    addPillRow(summary.topGenes, [220, 252, 231], [20, 83, 45]);

    addSection('Top Drug Candidates');
    addPillRow(summary.topDrugs, [255, 247, 213], [92, 59, 5]);

    addSection('Aggregator Summary — All Genes');
    addHighlightedBody(summary.aggregatorSummary, summary.topGenes);

    // Footer
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setDrawColor(220, 230, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(160, 174, 192);
      doc.text(`${label.footerLabel} — Confidential`, margin, pageHeight - 16);
      doc.text(`Page ${i} of ${total}`, pageWidth - margin, pageHeight - 16, { align: 'right' });
    }

    doc.save(`report-${summary.patientId}.pdf`);
  };

  const confidence = (results.confidence * 100).toFixed(1);

  return (
    <div
      style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
      className="rounded-2xl overflow-hidden shadow-2xl shadow-black/30"
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #08101f 0%, #0d1f3c 60%, #0a2540 100%)',
          borderBottom: `1px solid ${accent.hex}30`,
        }}
        className="relative px-8 py-6"
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: `linear-gradient(180deg, ${accent.hex} 0%, #0070f3 100%)` }}
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={13} style={{ color: accent.hex }} className="opacity-70" />
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: accent.hex, opacity: 0.8, letterSpacing: '0.14em' }}
              >
                Final Summary Report
              </span>
            </div>
            <h2 className="text-white text-xl font-bold tracking-tight leading-tight">
              {label.reportTitle}
            </h2>
            <p className="text-xs mt-1" style={{ color: '#4a7a96' }}>
              Pipeline analysis complete · {new Date().toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex-shrink-0"
            style={{ background: accent.dimBg, border: `1px solid ${accent.dimBorder}`, color: accent.hex }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = accent.hex + '38'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = accent.dimBg; }}
          >
            <Download size={14} />
            Download PDF
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ background: 'rgba(17, 24, 39, 0.55)' }} className="p-8 grid sm:grid-cols-2 gap-8">

        {/* Left column */}
        <div className="space-y-7">
          <Field icon={<User size={13} className="text-slate-500" />} iconBg="#f1f5f9" label="Patient ID">
            <span className="font-mono font-bold text-gray-200 text-sm tracking-wide">
              {summary.patientId}
            </span>
          </Field>

          <Field
            icon={<Dna size={13} style={{ color: accent.hex }} />}
            iconBg={accent.dimBg}
            label="Predicted Subtype"
          >
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-black text-3xl tracking-tight" style={{ color: accent.hex }}>
                {summary.subtype}
              </span>
              <ConfidenceBadge value={Number(confidence)} />
            </div>
          </Field>

          <Field
            icon={<Dna size={13} style={{ color: '#10b981' }} />}
            iconBg="rgba(16,185,129,0.10)"
            label="Top Driver Genes"
          >
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {summary.topGenes.map((gene) => <Pill key={gene} color="emerald">{gene}</Pill>)}
            </div>
          </Field>

          <Field
            icon={<PillIcon size={13} style={{ color: '#f59e0b' }} />}
            iconBg="rgba(245,158,11,0.10)"
            label="Top Drug Candidates"
          >
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {summary.topDrugs.map((drug) => <Pill key={drug} color="amber">{drug}</Pill>)}
            </div>
          </Field>
        </div>

        {/* Right column */}
        <div
          className="rounded-xl p-5 flex flex-col gap-3"
          style={{ background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(75, 85, 99, 0.7)' }}
        >
          <div
            className="flex items-center gap-2 pb-3"
            style={{ borderBottom: '1px solid rgba(75, 85, 99, 0.45)' }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.10)' }}
            >
              <ClipboardList size={13} style={{ color: '#3b82f6' }} />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#94a3b8', letterSpacing: '0.12em' }}
            >
              Aggregator Summary
            </span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line flex-1" style={{ color: '#cbd5e1' }}>
            {renderHighlightedSummary(summary.aggregatorSummary, topGenes)}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-8 py-3 flex items-center justify-between"
        style={{ background: 'rgba(17, 24, 39, 0.7)', borderTop: '1px solid rgba(75, 85, 99, 0.7)' }}
      >
        <span className="text-xs" style={{ color: '#9ca3af' }}>{label.footerLabel} · Confidential</span>
        <span className="text-xs font-mono" style={{ color: '#9ca3af' }}>{summary.patientId}</span>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ icon, iconBg, label, children }: {
  icon: React.ReactNode; iconBg: string; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase mb-1.5" style={{ color: '#94a3b8', letterSpacing: '0.12em' }}>
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const c = value >= 90
    ? { bg: '#dcfce7', text: '#166534', dot: '#16a34a' }
    : value >= 70
    ? { bg: '#fef9c3', text: '#854d0e', dot: '#ca8a04' }
    : { bg: '#fee2e2', text: '#991b1b', dot: '#dc2626' };
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {value}% confidence
    </span>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: 'emerald' | 'amber' }) {
  const s = color === 'emerald'
    ? { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' }
    : { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
  return (
    <span
      className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, letterSpacing: '0.04em' }}
    >
      {children}
    </span>
  );
}