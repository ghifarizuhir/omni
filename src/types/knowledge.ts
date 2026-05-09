export type KBStatus =
  | 'draft'
  | 'in_review'
  | 'published'
  | 'archived'
  | 'expired';

export type KBVisibility =
  | 'internal'
  | 'team'
  | 'public';

export type KBContentType =
  | 'how_to'
  | 'troubleshooting'
  | 'runbook'
  | 'reference'
  | 'faq'
  | 'incident_postmortem';

export interface KBCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  iconName: string;
  parentId?: string;
  sortOrder: number;
  articleCount: number;
}

export interface KBArticle {
  id: string;
  slug: string;
  publicId: string;
  title: string;
  summary: string;
  body: string;
  status: KBStatus;
  visibility: KBVisibility;
  contentType: KBContentType;
  categoryId: string;
  categoryName: string;
  tags: string[];
  authorId: string;
  authorName: string;
  contributorIds: string[];
  relatedCIIds: string[];
  relatedCIPublicIds: string[];
  linkedIncidentIds: string[];
  linkedProblemIds: string[];
  relatedArticleSlugs: string[];
  viewCount: number;
  helpfulCount: number;
  unhelpfulCount: number;
  averageReadTimeSeconds: number;
  publishedAt?: string;
  reviewedAt?: string;
  reviewDueAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  previousVersions?: number;
}

export interface KBFeedback {
  id: string;
  articleId: string;
  userId: string;
  isHelpful: boolean;
  comment?: string;
  createdAt: string;
}

export interface KBAnalytics {
  totalViews: number;
  totalSearches: number;
  uniqueUsersActive: number;
  helpfulRate: number;
  topSearches: Array<{
    term: string;
    count: number;
    hasMatchingArticle: boolean;
    matchingArticleSlug?: string;
  }>;
  topViewed: string[];
  topHelpful: string[];
  needsReview: string[];
  contentGaps: Array<{
    searchTerm: string;
    count: number;
    suggestedAction: string;
    linkedItemId?: string;
  }>;
  viewsTimeSeries: Array<{ date: string; views: number }>;
}
