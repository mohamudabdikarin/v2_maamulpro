import { useEffect, useState, type ReactNode } from 'react';
import { api, sessionStore } from '../../lib/api';
import { AuthenticatedImage } from './AuthenticatedImage';

export type CompanyBrand = {
    companyName: string;
    logoUrl?: string | null;
    companyEmail?: string;
    companyPhone?: string;
    companyAddress?: string;
};

let brandCache: CompanyBrand | null = null;
let brandPromise: Promise<CompanyBrand> | null = null;

const fallbackBrand = (): CompanyBrand => ({
    companyName: sessionStore.get()?.user.companyName || 'Company',
});

export async function loadCompanyBrand(): Promise<CompanyBrand> {
    if (brandCache) return brandCache;
    if (!brandPromise) {
        brandPromise = api<{
            companyName?: string;
            logoUrl?: string | null;
            companyEmail?: string;
            companyPhone?: string;
            companyAddress?: string;
        }>('/api/settings')
            .then((settings) => {
                brandCache = {
                    companyName: settings.companyName || fallbackBrand().companyName,
                    logoUrl: settings.logoUrl || null,
                    companyEmail: settings.companyEmail || '',
                    companyPhone: settings.companyPhone || '',
                    companyAddress: settings.companyAddress || '',
                };
                return brandCache;
            })
            .catch(() => {
                brandCache = fallbackBrand();
                return brandCache;
            });
    }
    return brandPromise;
}

export function useCompanyBrand() {
    const [brand, setBrand] = useState<CompanyBrand | null>(brandCache);
    useEffect(() => {
        let alive = true;
        loadCompanyBrand().then((value) => {
            if (alive) setBrand(value);
        });
        return () => {
            alive = false;
        };
    }, []);
    return brand;
}

function contactLine(brand: CompanyBrand) {
    return [brand.companyAddress, brand.companyPhone, brand.companyEmail].filter(Boolean).join(' · ');
}

type HeaderProps = {
    brand: CompanyBrand | null;
    title: string;
    subtitle?: string;
    meta?: ReactNode;
    compact?: boolean;
};

/** Shared company letterhead for on-screen and printed reports. */
export function ReportBrandHeader({ brand, title, subtitle, meta, compact }: HeaderProps) {
    const name = brand?.companyName || fallbackBrand().companyName;
    const contact = brand ? contactLine(brand) : '';

    return (
        <header className={`report-brand-header border-b-2 border-secondary/40 pb-4 dark:border-white/40 ${compact ? 'mb-4' : 'mb-6'}`}>
            <div className="flex items-start gap-4">
                {brand?.logoUrl ? (
                    <AuthenticatedImage
                        src={brand.logoUrl}
                        alt={`${name} logo`}
                        className="h-14 w-14 shrink-0 rounded-md border border-white-light object-contain bg-white p-1 dark:border-dark"
                    />
                ) : (
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md border border-secondary/20 bg-secondary/5 text-xs font-bold uppercase tracking-wide text-secondary dark:border-white/20 dark:text-white">
                        {name.slice(0, 2)}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="text-lg font-extrabold tracking-wide text-secondary dark:text-white sm:text-xl">{name}</div>
                    {contact && <p className="mt-0.5 text-[11px] leading-relaxed text-white-dark">{contact}</p>}
                    <div className={`mt-2 font-bold text-secondary dark:text-white ${compact ? 'text-sm' : 'text-base'}`}>{title}</div>
                    {subtitle && <p className="mt-0.5 text-xs text-white-dark">{subtitle}</p>}
                </div>
                {meta != null && <div className="shrink-0 text-right text-[10px] leading-relaxed text-white-dark">{meta}</div>}
            </div>
        </header>
    );
}

export function ReportBrandFooter({ brand }: { brand: CompanyBrand | null }) {
    const name = brand?.companyName || fallbackBrand().companyName;
    return (
        <footer className="report-brand-footer mt-8 border-t border-white-light pt-3 text-[10px] leading-relaxed text-white-dark dark:border-dark">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <span>
                    © {new Date().getFullYear()} {name}. All rights reserved.
                </span>
                <span>Confidential · Generated via MaamulPro</span>
            </div>
        </footer>
    );
}

/** A4-oriented print rules shared by report pages. */
export function ReportPrintStyles() {
    return (
        <style>{`
            @page { size: A4; margin: 12mm 14mm; }
            @media print {
                html, body { background: #fff !important; color: #111 !important; }
                aside, header.main-header, .main-header, .sidebar, nav, .print\\:hidden { display: none !important; }
                .main-content, main, .content, .app-shell, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: none !important; }
                .print-sheet {
                    box-shadow: none !important;
                    border: none !important;
                    border-radius: 0 !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #fff !important;
                    color: #111 !important;
                }
                .print-sheet, .print-sheet * { color: #111 !important; }
                .report-brand-header { border-color: #1e293b !important; }
                a { text-decoration: none !important; color: inherit !important; }
            }
        `}</style>
    );
}

type SheetProps = {
    children: ReactNode;
    className?: string;
    wide?: boolean;
};

export function ReportPrintSheet({ children, className = '', wide }: SheetProps) {
    return (
        <div
            className={`print-sheet mx-auto rounded-2xl border border-white-light bg-white p-7 shadow-sm dark:border-dark dark:bg-[#0e1726] ${
                wide ? 'max-w-6xl' : 'max-w-3xl'
            } ${className}`}
        >
            {children}
        </div>
    );
}

/** Escape helper for popup print documents. */
export function escapeHtml(value: unknown) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}

/** Build a self-contained branded HTML document for window.open print flows. */
export function brandedPrintHtml(opts: {
    brand: CompanyBrand;
    documentTitle: string;
    heading?: string;
    bodyHtml: string;
}) {
    const { brand, documentTitle, heading, bodyHtml } = opts;
    const contact = contactLine(brand);
    const logo = brand.logoUrl
        ? `<img src="${escapeHtml(brand.logoUrl)}" alt="" style="height:56px;width:56px;object-fit:contain;border:1px solid #e2e8f0;border-radius:6px;padding:4px;background:#fff" />`
        : `<div style="height:56px;width:56px;display:grid;place-items:center;border:1px solid #cbd5e1;border-radius:6px;font:bold 12px/1 Arial;color:#334155">${escapeHtml(brand.companyName.slice(0, 2).toUpperCase())}</div>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(documentTitle)}</title>
<style>
  @page { size: A4; margin: 12mm 14mm; }
  body { font: 13px/1.45 Arial, Helvetica, sans-serif; color: #172033; margin: 0; padding: 24px; }
  .sheet { max-width: 720px; margin: 0 auto; }
  .brand { display: flex; gap: 16px; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 14px; margin-bottom: 20px; }
  .brand h1 { margin: 0; font-size: 18px; letter-spacing: 0.02em; }
  .brand p { margin: 4px 0 0; color: #64748b; font-size: 11px; }
  .brand .title { margin-top: 10px; font-size: 15px; font-weight: 700; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; }
  th, td { border: 1px solid #dbe2ea; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { width: 28%; background: #f6f8fb; }
  footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; gap: 12px; }
  .actions { margin-top: 20px; }
  @media print { .actions { display: none; } body { padding: 0; } }
</style></head><body><div class="sheet">
  <header class="brand">${logo}<div>
    <h1>${escapeHtml(brand.companyName)}</h1>
    ${contact ? `<p>${escapeHtml(contact)}</p>` : ''}
    <div class="title">${escapeHtml(heading || documentTitle)}</div>
    <p>${escapeHtml(new Date().toLocaleString())}</p>
  </div></header>
  ${bodyHtml}
  <footer><span>© ${new Date().getFullYear()} ${escapeHtml(brand.companyName)}. All rights reserved.</span><span>Confidential · Generated via MaamulPro</span></footer>
  <div class="actions"><button onclick="window.print()" style="padding:10px 18px;font:14px Arial">Print</button></div>
</div></body></html>`;
}
