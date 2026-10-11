#!/usr/bin/env node
/** Emit a deterministic claim-level inventory for every current published article. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { articles } from '../lib/articles.ts';
import { auditPublishedClaims } from './boat-published-claim-audit.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = auditPublishedClaims({
  articles,
  attemptsDirectory: path.join(root, 'data', 'article-attempts'),
  articlesDirectory: path.join(root, 'content', 'articles'),
  rootReportPath: path.join(root, 'data', 'claim-verification.json'),
  rootMetadataPath: path.join(root, 'data', 'metadata.json')
});
process.stdout.write(JSON.stringify(report, null, 2) + String.fromCharCode(10));
