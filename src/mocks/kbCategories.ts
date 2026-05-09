import { KBCategory } from '../types/knowledge';

export const mockKBCategories: KBCategory[] = [
  {
    id: 'kbc-001',
    slug: 'getting-started',
    name: 'Getting Started',
    description: 'Onboarding guides and platform introductions for new staff.',
    iconName: 'Rocket',
    sortOrder: 1,
    articleCount: 2,
  },
  {
    id: 'kbc-002',
    slug: 'runbooks',
    name: 'Runbooks',
    description: 'Operational runbooks for common procedures and incident response.',
    iconName: 'BookOpen',
    sortOrder: 2,
    articleCount: 4,
  },
  {
    id: 'kbc-003',
    slug: 'troubleshooting',
    name: 'Troubleshooting',
    description: 'Diagnostic guides and decision flows for resolving common issues.',
    iconName: 'Wrench',
    sortOrder: 3,
    articleCount: 3,
  },
  {
    id: 'kbc-004',
    slug: 'how-to',
    name: 'How-To Guides',
    description: 'Step-by-step instructions for everyday tasks.',
    iconName: 'ListChecks',
    sortOrder: 4,
    articleCount: 2,
  },
  {
    id: 'kbc-005',
    slug: 'reference',
    name: 'Reference',
    description: 'Reference material, standards, and compliance documentation.',
    iconName: 'FileText',
    sortOrder: 5,
    articleCount: 1,
  },
  {
    id: 'kbc-006',
    slug: 'postmortems',
    name: 'Postmortems',
    description: 'Post-incident reviews and lessons learned.',
    iconName: 'Microscope',
    sortOrder: 6,
    articleCount: 0,
  },
];

export const getKBCategoryBySlug = (slug: string) =>
  mockKBCategories.find(c => c.slug === slug);
