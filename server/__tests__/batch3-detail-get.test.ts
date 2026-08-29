import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('detail get wiring', () => {
  it('CMDBDetail uses get not list.find', () => {
    const s = readFileSync('src/routes/cmdb/CMDBDetail.tsx', 'utf8');
    expect(s).toContain('cisService.get');
    expect(s).toContain('cisService.relationships(');
    expect(s).not.toContain('relationshipsAll()');
    // main CI must be fetched via get, not via mockCIs.find for primary lookup
    expect(s).toContain('useResource(() => cisService.get');
  });
  it('ArticleView uses article not allArticles.find for main', () => {
    const s = readFileSync('src/routes/kb/ArticleView.tsx', 'utf8');
    expect(s).toContain('knowledgeService.article');
    // main article lookup should not be allArticles.find(a => a.slug
    // we allow relatedArticleSlugs mapping to keep find for related, but main must be via useResource article
    expect(s).toMatch(/useResource\(\(\) => knowledgeService\.article/);
  });
});
