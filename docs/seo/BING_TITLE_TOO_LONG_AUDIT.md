# Bing Site Scan — Long Article Titles

Date: 2026-10-11
Repository: `TrendforgeHQ/Trendforgehq.github.io`
Production URL: https://trendforgehq.github.io/

## Observed evidence

Bing Webmaster Tools Site Scan completed with 92 pages scanned, 0 errors and 39 warnings. The selected warning was `Title too long`. The affected article URLs supplied in the audit report were mostly page depth 2, with four page-depth-1 entries.

The sitemap report separately showed 1 sitemap processed successfully, 0 sitemap errors, 0 warnings and 62 URLs discovered. Sitemap discovery is not equivalent to indexing.

## Root cause verified in source

- `app/layout.tsx` applies the global title template `%s | TrendForge`.
- `lib/seo.ts` previously allowed the article-specific SEO title to be up to 70 characters before that template suffix was appended.
- Therefore the rendered HTML title could exceed 70 characters (up to 83 characters for a 70-character title plus the 13-character suffix), even though the SEO helper's own limit passed.
- This is consistent with Bing's long-title warning. It does not prove that title length caused the separate `Not discovered` indexing status.

## Change made on branch `fix/bing-long-article-titles`

- Reduced the article-specific SEO title limit to 55 characters, leaving room for the 13-character ` | TrendForge` suffix (maximum rendered title: 68 characters).
- Kept dash-delimited title shortening when a meaningful first segment fits.
- Updated `scripts/validate-seo.ts` to validate both the 10–55-character article title and the final rendered title including the global suffix.
- No article slugs, canonical URLs, article body content, sitemap routes, robots directives or publishing workflows were changed.

## Verification still required

Run the repository's production build and SEO validator through CI on the pull request. After deployment, re-run Bing Site Scan to confirm whether the warnings clear. Bing's crawl/index status must be monitored separately; this change does not guarantee indexing.
