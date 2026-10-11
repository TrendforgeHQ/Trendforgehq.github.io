export type PublishedCatalogueArticle = {
  file: string;
  title: string;
  words: number;
  urls: number;
  sourceHeading: boolean;
  emptyHeadings: number;
  repeatedParagraphs: number;
  findings: string[];
};
export function auditPublishedCatalogue(articleDirectory: string): PublishedCatalogueArticle[];
