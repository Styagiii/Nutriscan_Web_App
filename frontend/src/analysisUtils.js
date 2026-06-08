export function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/* Map section titles to color-coding categories */
function getSectionStyle(title) {
  const t = title.toLowerCase();
  if (t.includes('good') || t.includes('✅'))
    return { accent: '#3fff8b', bg: 'rgba(63, 255, 139, 0.06)', glow: 'rgba(63, 255, 139, 0.08)' };
  if (t.includes('harmful') || t.includes('🚫') || t.includes('❌'))
    return { accent: '#ff6b6b', bg: 'rgba(255, 107, 107, 0.06)', glow: 'rgba(255, 107, 107, 0.08)' };
  if (t.includes('watch') || t.includes('⚠') || t.includes('preserv') || t.includes('chemical') || t.includes('color') || t.includes('sugar'))
    return { accent: '#ffb347', bg: 'rgba(255, 179, 71, 0.06)', glow: 'rgba(255, 179, 71, 0.08)' };
  if (t.includes('calorie') || t.includes('🔥'))
    return { accent: '#00e3fd', bg: 'rgba(0, 227, 253, 0.06)', glow: 'rgba(0, 227, 253, 0.08)' };
  if (t.includes('ingredient') || t.includes('📋'))
    return { accent: '#00e3fd', bg: 'rgba(0, 227, 253, 0.04)', glow: 'rgba(0, 227, 253, 0.06)' };
  if (t.includes('summary') || t.includes('📝'))
    return { accent: '#3fff8b', bg: 'rgba(63, 255, 139, 0.04)', glow: 'rgba(63, 255, 139, 0.06)' };
  if (t.includes('rating'))
    return { accent: '#3fff8b', bg: 'rgba(63, 255, 139, 0.05)', glow: 'rgba(63, 255, 139, 0.08)' };
  return { accent: '#00e3fd', bg: 'rgba(0, 227, 253, 0.04)', glow: 'rgba(0, 227, 253, 0.06)' };
}

export function analysisMarkdownToHtmlBlocks(markdown) {
  const sections = markdown.split('### ').filter((s) => s.trim() !== '');
  return sections.map((section) => {
    const lines = section.trim().split('\n');
    const title = lines.shift().trim();
    const style = getSectionStyle(title);
    const items = lines
      .map((line) => {
        const cleaned = line.trim().replace(/^[-*]\s*/, '');
        if (!cleaned) return '';
        const formatted = escapeHtml(cleaned)
          .replace(
            /\*\*(.*?)\*\*/g,
            `<strong style="color:${style.accent}">\$1</strong>`
          );
        return `<li style="margin-bottom:6px;color:#a8abb3;line-height:1.6">${formatted}</li>`;
      })
      .filter(Boolean)
      .join('');
    const listHtml = items ? `<ul style="margin:0;padding-left:1.25rem;list-style:none">${items.replace(/<li /g, '<li ')}</ul>` : '';
    /* For non-list content (paragraphs) */
    const nonListLines = lines.filter(l => !l.trim().startsWith('-') && !l.trim().startsWith('*') && l.trim());
    const paraHtml = nonListLines.length > 0 && !items
      ? `<p style="margin:0;color:#a8abb3;line-height:1.6">${nonListLines.map(l => escapeHtml(l.trim())).join('<br/>')}</p>`
      : '';
    return { title, html: listHtml || paraHtml, style };
  });
}

export function parseRatingFromAnalysis(analysisText) {
  const m = analysisText.match(/\bRATING:\s*(\d+)\s*/im);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 10 ? n : null;
}

export function stripRatingLine(analysisText) {
  return analysisText.replace(/\n?\s*RATING:\s*\d+\s*.*$/im, '').trim();
}
