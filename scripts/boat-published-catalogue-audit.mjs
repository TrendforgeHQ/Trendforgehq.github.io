/**
 * Deterministic, read-only structural audit of the canonical published article index.
 * This does not verify semantic factual support, source freshness, or source reachability.
 * @param {Array<{slug?:string,title?:string,content?:string[],sources?:Array<{title?:string,url?:string}>}>} articles
 */
export function auditPublishedCatalogue(articles) {
  if (!Array.isArray(articles)) return [];
  return articles.map((article) => {
    const blocks = Array.isArray(article?.content) ? article.content.filter((x) => typeof x === 'string') : [];
    const body = blocks.join('\n\n');
    const sourceRecords = Array.isArray(article?.sources) ? article.sources : [];
    const sourceUrls = sourceRecords.map((source) => source?.url).filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url));
    const inlineUrls = body.match(/https?:\/\/[^\s)>"']+/gi) ?? [];
    const urls = [...sourceUrls, ...inlineUrls];
    const headings = body.split(/\r?\n/).filter((line) => /^#{1,6}\s*$/.test(line));
    const paragraphs = body.split(/\r?\n\s*\r?\n/).map((part) =>
      part.replace(/^#{1,6}\s+.*$/gm, '').replace(/^[-*+]\s+/gm, '').replace(/\s+/g, ' ').trim().toLowerCase()
    ).filter((part) => part.length >= 40 && !/^https?:\/\//.test(part));
    const seen = new Set();
    let repeatedParagraphs = 0;
    for (const paragraph of paragraphs) {
      if (seen.has(paragraph)) repeatedParagraphs++;
      seen.add(paragraph);
    }
    const sourceHeading = sourceRecords.length > 0;
    const words = body.replace(/!?(\[[^\]]*\])\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
    const findings = [];
    if (!sourceHeading) findings.push('No rendered Sources section');
    if (urls.length === 0) findings.push('No HTTP(S) source links found');
    if (headings.length) findings.push(`${headings.length} empty heading(s)`);
    if (repeatedParagraphs) findings.push(`${repeatedParagraphs} repeated paragraph(s)`);
    return {
      slug: typeof article?.slug === 'string' ? article.slug : '',
      title: typeof article?.title === 'string' && article.title.trim() ? article.title : (typeof article?.slug === 'string' ? article.slug : 'Untitled article'),
      words: words.length,
      urls: urls.length,
      sourceHeading,
      emptyHeadings: headings.length,
      repeatedParagraphs,
      findings,
    };
  }).sort((a, b) => (b.findings.length - a.findings.length) || a.title.localeCompare(b.title));
}
