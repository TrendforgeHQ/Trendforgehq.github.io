import fs from 'node:fs';
import path from 'node:path';

/**
 * Read-only structural inventory. This deliberately does not claim semantic fact-checking.
 * @param {string} articleDirectory
 */
export function auditPublishedCatalogue(articleDirectory) {
  try {
    return fs.readdirSync(articleDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
      .map((entry) => {
        const filePath = path.join(articleDirectory, entry.name);
        const raw = fs.readFileSync(filePath, 'utf8');
        const body = raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
        const titleMatch = raw.match(/^title:\s*["']?(.+?)["']?\s*$/m);
        const headingMatch = body.match(/^#\s+(.+)$/m);
        const title = (titleMatch?.[1] ?? headingMatch?.[1] ?? entry.name.replace(/\.md$/i, '')).replace(/["']$/, '').trim();
        const urls = body.match(/https?:\/\/[^\s)>"']+/gi) ?? [];
        const headings = body.split(/\r?\n/).filter((line) => /^#{1,6}\s*$/.test(line));
        const paragraphs = body.split(/\r?\n\s*\r?\n/).map((part) =>
          part.replace(/^#{1,6}\s+/gm, '').replace(/^[-*+]\s+/gm, '').replace(/\s+/g, ' ').trim().toLowerCase()
        ).filter((part) => part.length >= 40 && !/^https?:\/\//.test(part));
        const seen = new Set();
        let repeatedParagraphs = 0;
        for (const paragraph of paragraphs) {
          if (seen.has(paragraph)) repeatedParagraphs++;
          seen.add(paragraph);
        }
        const sourceHeading = /^#{1,6}\s*(sources|references|sources and references|further reading)\s*#*\s*$/im.test(body);
        const words = body.replace(/!?(\[[^\]]*\])\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
        const findings = [];
        if (!sourceHeading) findings.push('No Sources/References heading');
        if (urls.length === 0) findings.push('No HTTP(S) links found');
        if (headings.length) findings.push(`${headings.length} empty heading(s)`);
        if (repeatedParagraphs) findings.push(`${repeatedParagraphs} repeated paragraph(s)`);
        return { file: entry.name, title, words: words.length, urls: urls.length, sourceHeading, emptyHeadings: headings.length, repeatedParagraphs, findings };
      })
      .sort((a, b) => (b.findings.length - a.findings.length) || a.title.localeCompare(b.title));
  } catch {
    return [];
  }
}
