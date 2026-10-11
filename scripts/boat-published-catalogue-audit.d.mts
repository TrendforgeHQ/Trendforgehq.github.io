export type PublishedCatalogueArticleInput = {
  slug?: string;
  title?: string;
  content?: string[];
  sources?: Array<{ title?: string; url?: string }>;
};
export type PublishedCatalogueArticle = {
  slug: string;
  title: string;
  words: number;
  urls: number;
  sourceHeading: boolean;
  emptyHeadings: number;
  repeatedParagraphs: number;
  findings: string[];
};
export function auditPublishedCatalogue(articles: PublishedCatalogueArticleInput[] | unknown): PublishedCatalogueArticle[];
