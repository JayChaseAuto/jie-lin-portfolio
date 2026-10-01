import { esc, fmt } from '../dist/assets/render.mjs';

const palette = {
  ivory: '#f6f2e9',
  white: '#fffdf8',
  navy: '#173a3e',
  teal: '#167565',
  bronze: '#b8895e',
  muted: '#556b6b',
  line: '#d9dfd6',
};
let previewId = 0;

function svg(title, description, content) {
  const id = `project-preview-${++previewId}`;
  return `<svg class="project-preview" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 240" role="img" aria-labelledby="${id}-title" aria-describedby="${id}-description" focusable="false"><title id="${id}-title">${esc(title)}</title><desc id="${id}-description">${esc(description)}</desc><rect width="560" height="240" rx="12" fill="${palette.ivory}"/><g font-family="Arial, Helvetica, sans-serif" fill="${palette.navy}">${content}</g></svg>`;
}

/** Preview the same enterprise-to-equity bridge used by the operating DCF. */
export function valuationPreview(result) {
  const { enterpriseValue, equityValue, inputs: { cash, debt } } = result;
  if (![enterpriseValue, equityValue, cash, debt].every(Number.isFinite)) {
    throw new TypeError('The valuation preview requires finite DCF values.');
  }

  const afterCash = enterpriseValue + cash;
  const low = Math.min(0, enterpriseValue, afterCash, equityValue);
  const high = Math.max(0, enterpriseValue, afterCash, equityValue);
  const y = value => 188 - (value - low) / (high - low || 1) * 98;
  const columns = [
    { x: 49, start: 0, end: enterpriseValue, label: 'Enterprise', value: fmt(enterpriseValue, 1), color: palette.navy },
    { x: 178, start: enterpriseValue, end: afterCash, label: 'Cash', value: `${cash >= 0 ? '+' : ''}${fmt(cash, 1)}`, color: palette.teal },
    { x: 307, start: afterCash, end: equityValue, label: 'Debt', value: `${debt === 0 ? '' : '−'}${fmt(debt, 1)}`, color: palette.bronze },
    { x: 436, start: 0, end: equityValue, label: 'Equity', value: fmt(equityValue, 1), color: palette.teal },
  ];
  const bridge = columns.map((column, index) => {
    const top = Math.min(y(column.start), y(column.end));
    const height = Math.max(1.5, Math.abs(y(column.start) - y(column.end)));
    const connector = index < columns.length - 1
      ? `<path d="M${column.x + 80} ${y(column.end)}H${columns[index + 1].x}" fill="none" stroke="${palette.muted}" stroke-width="1.3" stroke-dasharray="4 4"/>`
      : '';
    const fitValue = column.value.length > 8 ? ' textLength="110" lengthAdjust="spacingAndGlyphs"' : '';
    return `<text x="${column.x + 40}" y="76" text-anchor="middle" font-size="26" font-weight="700" fill="${palette.navy}"${fitValue}>${esc(column.value)}</text><rect x="${column.x}" y="${top}" width="80" height="${height}" rx="3" fill="${column.color}"/>${connector}<text x="${column.x + 40}" y="218" text-anchor="middle" font-size="22">${esc(column.label)}</text>`;
  }).join('');

  return svg(
    'Enterprise-to-equity valuation bridge',
    `DCF model outputs in CAD millions: enterprise value ${fmt(enterpriseValue, 1)}, plus non-operating cash ${fmt(cash, 1)}, less debt claim ${fmt(debt, 1)}, gives equity value ${fmt(equityValue, 1)}. Bar heights use the same scale; cash and debt are changes between the total values.`,
    `<text x="24" y="28" font-size="21" font-weight="700">Enterprise to equity</text><text x="536" y="28" text-anchor="end" font-size="16" fill="${palette.muted}">Model outputs · CAD m</text><path d="M24 45H536" stroke="${palette.line}"/><path d="M38 ${y(0)}H528" stroke="${palette.line}"/>${bridge}`,
  );
}

/** A conceptual workflow, deliberately without fabricated application data. */
export function analyzerPreview() {
  const cards = [26, 208, 390].map(x => `<rect x="${x}" y="54" width="144" height="150" rx="9" fill="${palette.white}" stroke="${palette.line}"/>`).join('');
  const arrows = [180, 362].map(x => `<path d="M${x} 130H${x + 17}m-5-5 5 5-5 5" fill="none" stroke="${palette.bronze}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const reportIcon = `<g fill="none" stroke="${palette.teal}" stroke-width="1.7" stroke-linejoin="round"><rect x="45" y="79" width="27" height="31" rx="2"/><rect x="51" y="73" width="27" height="31" rx="2" fill="${palette.white}"/><path d="M56 84H73M56 90H73M56 96H73M62 81V99M68 81V99"/></g>`;
  const reviewIcon = `<g fill="none" stroke="${palette.teal}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="229" y="75" width="29" height="32" rx="3"/><path d="m235 84 2 2 4-4M245 84H252m-17 9 2 2 4-4M245 93H252M235 101H252"/></g>`;
  const exportIcon = `<g fill="none" stroke="${palette.teal}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M435 83V75H412V107H435V100M418 83H425M418 90H423M427 92H445m-5-5 5 5-5 5"/></g>`;
  return svg(
    'Financial Analyzer workflow illustration',
    'Conceptual workflow based on the application case study: import supported Excel or CSV reports, review products and inventory assumptions, then export reviewable reports. This illustration is not an application screenshot.',
    `<text x="24" y="29" font-size="21" font-weight="700">Workflow illustration</text><text x="536" y="29" text-anchor="end" font-size="16" fill="${palette.muted}">Financial Analyzer</text>${cards}${arrows}${reportIcon}${reviewIcon}${exportIcon}<text x="149" y="80" text-anchor="end" font-size="16" fill="${palette.muted}">01</text><text x="331" y="80" text-anchor="end" font-size="16" fill="${palette.muted}">02</text><text x="513" y="80" text-anchor="end" font-size="16" fill="${palette.muted}">03</text><text x="46" y="137" font-size="24" font-weight="700">Import</text><text x="46" y="161" font-size="17" fill="${palette.muted}">Supported</text><text x="46" y="183" font-size="17" fill="${palette.muted}">Excel / CSV</text><text x="228" y="137" font-size="24" font-weight="700">Review</text><text x="228" y="161" font-size="17" fill="${palette.muted}">Products</text><text x="228" y="183" font-size="17" fill="${palette.muted}">&amp; inventory</text><text x="410" y="137" font-size="24" font-weight="700">Export</text><text x="410" y="161" font-size="17" fill="${palette.muted}">Reviewable</text><text x="410" y="183" font-size="17" fill="${palette.muted}">reports</text><text x="24" y="226" font-size="16" fill="${palette.muted}">Conceptual workflow · Case study illustration</text>`,
  );
}
