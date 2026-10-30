#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const normalizeParagraph = value => value.replace(/\s+/g, ' ').trim();
const isPlainParagraph = value => {
  const trimmed = value.trim();
  return Boolean(trimmed) &&
    !/^#{1,6}\s/.test(trimmed) &&
    !/^>/.test(trimmed) &&
    !/^[-*+]\s/.test(trimmed) &&
    !/^\d+[.)]\s/.test(trimmed) &&
    !/^\`\`\`/.test(trimmed) &&
    !/^\[[^\]]+\]:/.test(trimmed);
};

export function proposeStructuralRepairs(markdown) {
  if (typeof markdown !== 'string') throw new TypeError('markdown must be a string');
  const original = markdown;
  const lines = markdown.split('\n');
  let frontmatter = false;
  let frontmatterSeen = false;
  let inSources = false;
  let inFence = false;
  const kept = [];
  const changes = [];
  const seenParagraphs = new Set();
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const block = paragraph.join('\n');
    const normalized = normalizeParagraph(block);
    if (!inSources && !inFence && isPlainParagraph(block) && seenParagraphs.has(normalized)) {
      changes.push({ type: 'duplicate_paragraph_removed', text: normalized.slice(0, 240) });
    } else {
      kept.push(...paragraph);
      if (!inSources && !inFence && isPlainParagraph(block)) seenParagraphs.add(normalized);
    }
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line.trim() === '---') { frontmatter = true; frontmatterSeen = true; kept.push(line); continue; }
    if (frontmatter) {
      kept.push(line);
      if (line.trim() === '---') frontmatter = false;
      continue;
    }
    if (/^\s*```/.test(line)) {
      flushParagraph();
      inFence = !inFence;
      kept.push(line);
      continue;
    }
    if (!inFence && /^#{1,6}\s*$/.test(line)) {
      flushParagraph();
      if (inSources) kept.push(line);
      else changes.push({ type: 'empty_heading_removed', line: i + 1, text: line });
      continue;
    }
    if (!inFence && /^#{1,6}\s+/.test(line)) {
      flushParagraph();
      const heading = line.replace(/^#{1,6}\s+/, '').trim().toLowerCase();
      if (/^(sources|references|citations|source notes)$/.test(heading)) inSources = true;
      kept.push(line);
      continue;
    }
    if (!inFence && inSources) {
      flushParagraph();
      kept.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      kept.push(line);
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  let repairedMarkdown = kept.join('\n');
  if (original.endsWith('\n') && !repairedMarkdown.endsWith('\n')) repairedMarkdown += '\n';
  return {
    mode: 'sandbox-proposal',
    changed: repairedMarkdown !== original,
    beforeSha256: sha256(original),
    afterSha256: sha256(repairedMarkdown),
    changes,
    repairedMarkdown,
    limitations: [
      'Only exact duplicate plain-text paragraphs and empty Markdown headings outside frontmatter and Sources/References sections are eligible.',
      'Factual claims, citations, headings with text, lists, code blocks, frontmatter, and source sections are not rewritten.',
      'The input is never modified; output must be written to a different path and reviewed/re-tested before any production use.'
    ]
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) throw new Error(`Unexpected argument: ${argv[i]}`);
    const key = argv[i].slice(2);
    if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Missing value for --${key}`);
    args[argv[i].slice(2)] = argv[++i];
  }
  return args;
}
export function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.input || !args.output) throw new Error('Required arguments --input and --output');
  const inputPath = path.resolve(args.input), outputPath = path.resolve(args.output);
  if (inputPath === outputPath) throw new Error('Refusing in-place repair: --output must differ from --input');
  if (fs.existsSync(outputPath)) throw new Error('Refusing to overwrite an existing output file');
  const input = fs.readFileSync(inputPath, 'utf8');
  const result = proposeStructuralRepairs(input);
  if (!result.changed) {
    process.stdout.write(JSON.stringify({ ...result, repairedMarkdown: undefined, outputPath, written: false }, null, 2) + '\n');
    return 0;
  }
  fs.writeFileSync(outputPath, result.repairedMarkdown, { flag: 'wx' });
  process.stdout.write(JSON.stringify({ ...result, repairedMarkdown: undefined, outputPath, written: true }, null, 2) + '\n');
  return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.exitCode = runCli(); }
  catch (error) { process.stderr.write(`BOAT Repair Engine error: ${error.message}\n`); process.exitCode = 2; }
}
