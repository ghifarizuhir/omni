import { KBFeedback } from '../types/knowledge';

export const mockKBFeedback: KBFeedback[] = [
  // ─── KB-00187 (Payment API restart) — 24 helpful, 2 unhelpful ────────────
  { id: 'kbf-001', articleId: 'kb-00187', userId: 'u-005', isHelpful: true, comment: 'Saved me during the outage last week.', createdAt: '2026-04-22T14:30:00Z' },
  { id: 'kbf-002', articleId: 'kb-00187', userId: 'u-004', isHelpful: true, createdAt: '2026-04-23T09:00:00Z' },
  { id: 'kbf-003', articleId: 'kb-00187', userId: 'u-003', isHelpful: true, comment: 'The pool saturation check command was exactly what I needed.', createdAt: '2026-04-24T11:00:00Z' },
  { id: 'kbf-004', articleId: 'kb-00187', userId: 'u-008', isHelpful: true, createdAt: '2026-04-25T08:00:00Z' },
  { id: 'kbf-005', articleId: 'kb-00187', userId: 'u-002', isHelpful: true, createdAt: '2026-04-26T10:00:00Z' },
  { id: 'kbf-006', articleId: 'kb-00187', userId: 'u-009', isHelpful: true, createdAt: '2026-04-27T13:00:00Z' },
  { id: 'kbf-007', articleId: 'kb-00187', userId: 'u-006', isHelpful: true, createdAt: '2026-04-28T09:00:00Z' },
  { id: 'kbf-008', articleId: 'kb-00187', userId: 'u-007', isHelpful: true, createdAt: '2026-04-29T10:00:00Z' },
  { id: 'kbf-009', articleId: 'kb-00187', userId: 'u-010', isHelpful: true, createdAt: '2026-04-30T11:00:00Z' },
  { id: 'kbf-010', articleId: 'kb-00187', userId: 'u-012', isHelpful: true, createdAt: '2026-05-01T08:00:00Z' },
  { id: 'kbf-011', articleId: 'kb-00187', userId: 'u-011', isHelpful: false, comment: 'Procedure didn\'t work for staging environment — needs update.', createdAt: '2026-05-02T14:00:00Z' },
  { id: 'kbf-012', articleId: 'kb-00187', userId: 'u-001', isHelpful: false, comment: 'Step 3 rollout command timed out at 90s, not 120s as documented. Check timeout default.', createdAt: '2026-05-03T09:00:00Z' },
  { id: 'kbf-013', articleId: 'kb-00187', userId: 'u-003', isHelpful: true, createdAt: '2026-05-04T10:00:00Z' },
  { id: 'kbf-014', articleId: 'kb-00187', userId: 'u-004', isHelpful: true, createdAt: '2026-05-05T11:00:00Z' },
  { id: 'kbf-015', articleId: 'kb-00187', userId: 'u-008', isHelpful: true, createdAt: '2026-05-06T09:00:00Z' },

  // ─── KB-00203 (Payment API 5xx) — 38 helpful, 1 unhelpful ────────────────
  { id: 'kbf-016', articleId: 'kb-00203', userId: 'u-004', isHelpful: true, comment: 'The decision flow is perfect. Exactly what an L1 needs.', createdAt: '2026-04-20T10:00:00Z' },
  { id: 'kbf-017', articleId: 'kb-00203', userId: 'u-002', isHelpful: true, createdAt: '2026-04-21T11:00:00Z' },
  { id: 'kbf-018', articleId: 'kb-00203', userId: 'u-003', isHelpful: true, createdAt: '2026-04-22T09:00:00Z' },
  { id: 'kbf-019', articleId: 'kb-00203', userId: 'u-009', isHelpful: true, createdAt: '2026-04-23T14:00:00Z' },
  { id: 'kbf-020', articleId: 'kb-00203', userId: 'u-005', isHelpful: false, comment: 'Step 4 (recent deploys) should come before the downstream check in most cases.', createdAt: '2026-04-24T10:00:00Z' },

  // ─── KB-00198 (DB access best practices) — 18 helpful, 0 unhelpful ───────
  { id: 'kbf-021', articleId: 'kb-00198', userId: 'u-011', isHelpful: true, comment: 'Great summary before submitting a DB access request.', createdAt: '2026-04-25T10:00:00Z' },
  { id: 'kbf-022', articleId: 'kb-00198', userId: 'u-012', isHelpful: true, createdAt: '2026-04-26T11:00:00Z' },
  { id: 'kbf-023', articleId: 'kb-00198', userId: 'u-009', isHelpful: true, createdAt: '2026-04-27T09:00:00Z' },

  // ─── KB-00199 (PCI-DSS) — 12 helpful, 1 unhelpful ────────────────────────
  { id: 'kbf-024', articleId: 'kb-00199', userId: 'u-001', isHelpful: true, comment: 'Should be required reading before any prod DB access.', createdAt: '2026-04-15T10:00:00Z' },
  { id: 'kbf-025', articleId: 'kb-00199', userId: 'u-011', isHelpful: true, createdAt: '2026-04-16T11:00:00Z' },
  { id: 'kbf-026', articleId: 'kb-00199', userId: 'u-012', isHelpful: false, comment: 'The retention table is out of date — 13 months is now 18 months per new compliance rules.', createdAt: '2026-05-05T14:00:00Z' },

  // ─── KB-00156 (SSH bastion) — 41 helpful ─────────────────────────────────
  { id: 'kbf-027', articleId: 'kb-00156', userId: 'u-009', isHelpful: true, createdAt: '2026-02-10T10:00:00Z' },
  { id: 'kbf-028', articleId: 'kb-00156', userId: 'u-003', isHelpful: true, comment: 'The ssh config snippet saves a lot of time.', createdAt: '2026-02-11T11:00:00Z' },
  { id: 'kbf-029', articleId: 'kb-00156', userId: 'u-011', isHelpful: true, createdAt: '2026-02-12T09:00:00Z' },

  // ─── KB-00134 (on-call handover) — 8 helpful ─────────────────────────────
  { id: 'kbf-030', articleId: 'kb-00134', userId: 'u-002', isHelpful: true, comment: 'Handover template is very useful. Saved to my snippets.', createdAt: '2026-03-15T10:00:00Z' },
  { id: 'kbf-031', articleId: 'kb-00134', userId: 'u-003', isHelpful: true, createdAt: '2026-03-16T11:00:00Z' },
  { id: 'kbf-032', articleId: 'kb-00134', userId: 'u-009', isHelpful: true, createdAt: '2026-03-17T09:00:00Z' },
];

export const getFeedbackForArticle = (articleId: string) =>
  mockKBFeedback.filter(f => f.articleId === articleId);

export const getHelpfulRateForArticle = (articleId: string): number => {
  const feedback = getFeedbackForArticle(articleId);
  if (feedback.length === 0) return 0;
  return feedback.filter(f => f.isHelpful).length / feedback.length;
};
