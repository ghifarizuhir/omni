# Monitoring

> **Route utama:** `/monitoring` · **ITIL 4 Practice:** Monitoring & Event Management · **Sumber kode:** `src/routes/monitoring/`, `server/routes/monitoring.ts` + `events.ts`

Modul Monitoring mengelola event stream, monitoring rule (PromQL/threshold/anomaly/dst.), alert routing dengan escalation, dan coverage report CI.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/monitoring` | `MonitoringOverview` | KPI + active alerts feed + health rail |
| `/monitoring/events` | `EventStream` | Live event stream dengan filter |
| `/monitoring/events/:id` | `EventDetail` | Detail event + lineage |
| `/monitoring/rules` | `MonitoringRules` | CRUD rule (wizard 3-step) |
| `/monitoring/routing` | `AlertRouting` | CRUD route + escalation + quiet hours |
| `/monitoring/coverage` | `CoverageReport` | Gap analysis CI tanpa rule |

`MonitoringLayout` accent: P1=red, P2=orange, default=blue. KPI strip: active events, P1 open, P2 open, unacknowledged.

---

## 2. Key Features

- **Event stream** dengan pause/resume, time range (24h/7d/30d), CSV export.
- **Rule types**: threshold, anomaly, log_pattern, synthetic, absence.
- **Sources**: prometheus, opentelemetry, log_pattern, synthetic, webhook, cicd, cloud_provider, manual.
- **Alert channels**: sms, slack, email, in_app, teams, webhook.
- **Escalation policy** dengan delay + recipients per step.
- **Quiet hours** dengan timezone, fromHour/toHour, daysOfWeek.
- **Coverage analysis** dengan gap detection + bulk rule creation.
- **Signal-to-noise ratio** per rule (color: ≥80% green / ≥50% amber / red).
- **Optimistic mutations** dengan revert on error.

---

## 3. MonitoringOverview

### Main KPI cards
Active Events · P1 Open · P2 Open · Unacknowledged.

### Active Alerts Feed
First 8 events via EventCard → klik ke detail. "View all" link.

### Right rail
- **Rules Panel**: total/enabled/disabled/firing 24h + "Manage rules"
- **Alert Routing**: routes/channels count + "Configure routing"
- **Connected Sources** panel
- **Coverage**: % (green ≥80, amber ≥60, red &lt;60), bar, covered/total CIs + link

---

## 4. EventStream

### Filter
- Search (title/message/publicId/affected CI)
- Status (open/acknowledged/resolved/suppressed)
- Severity P1-P4
- Source, Type
- Time range 24h/7d/30d

### Quick chips
- Active P1/P2 (open + acknowledged)
- Exceptions / Warnings / Informational
- Last 24h

### Pause feature
Freeze events; banner "Resume (X new)" muncul saat ada update baru.

### Display
Events grouped by date header (TODAY/YESTERDAY/full date). EventCard per event.

### Export
CSV: ID, Title, Severity, Status, Source, Fired At, Tags.

### Stats rail (lg+)
Total/Open/Acknowledged/Resolved + Exception/Warning/Informational breakdown. Mobile via drawer.

---

## 5. EventDetail

### Top bar
Back · Acknowledge / Resolve / Reopen · Copy ID / Copy link.

### Main card
Severity bar (P1 red dst), type badge, source + publicId, title, status with acked-by, fired/last seen, severity badge, impacted CIs count.

### Left column (60%)
1. **Affected CIs Card**: list CIs (icon, name, type, environment, criticality, "Explore in CMDB" → /cmdb) + "View dependency graph" → /cmdb/graph?ci=
2. **Triggered by Rule Card**: rule publicId, name, type/severity/cooldown/fires 24h grid, PromQL query monospace, "Open rule"
3. **Linked Incident Card**: kalau ada link → incident info; kalau tidak → "Create Incident from alert" modal → /incidents/{publicId}
4. **Related Events Card**: grouped by `correlationKey`, max 5, dengan "THIS EVENT" highlight

### Right column (40%)
1. **Event Timeline**: system events + comments (composer textarea)
2. **Raw Event Payload**: collapsible, "Copy JSON", dark terminal theme
3. **Tags & Metadata**: tag badges + "Add tag" inline input

### ResolveEventModal
Kalau event punya `linkedIncidentId`: "Resolve event only" vs "Resolve event + open incident".

---

## 6. MonitoringRules

Filter: search, type (threshold/anomaly/log_pattern/synthetic/absence), severity, enabled.

Stats strip: type breakdown, Avg fires (30d), Noisy count (S/N &lt;0.5), Never fired count.

DataTable kolom: ☐ · Status toggle · Public ID · Name · Type badge · Severity · Targets count · Last Fired · Fires (30d) + sparkline · S/N % (color) · Route link · Actions (Edit/Test/Delete kalau canManage).

### Wizard Modal (3-step)
Define → Conditions → Routing. Save/Create button + "Save as draft" optional.

### Rule Test Modal
List channels per route, channel preview, "Run all" button. Catatan: tidak ada SMS/call real, Slack hooks fire kalau enabled.

### Delete Confirmation
Modal dengan rule name + "Delete rule".

---

## 7. AlertRouting

Layout split: route list kiri / editor kanan.

### Left: Route List
Cards: publicId, status dot, name, description (line-clamp-2), channel icons (first 3), rule count, last triggered.

### Right: Editor (collapsible sections)
- **Match Conditions**: severity pills (P1-P4), sources (tag input), tags (tag input), matching rules card.
- **Channels**: 6 channel cards (sms/slack/email/in_app/teams/webhook), checkbox + mini config + Edit modal.
- **Escalation Policy**: vertical timeline steps (delay, recipients, channels), edit/delete per step, "Add step".
- **Quiet Hours**: enable checkbox, timezone, fromHour/toHour, daysOfWeek toggle (S M T W T F S).

### Test Route Modal
Warning: simulasi, no real alerts kecuali Slack webhooks. "Run dry-run".

---

## 8. CoverageReport

State: groupBy (type/service), expandedCIs, bulkCreate modal.

### Critical Gaps Hero
Red card "N CRITICAL GAPS DETECTED" dengan grid CI cards + "Suggest a rule" expandable + bulk create.

### Coverage Matrix
Search CIs + group by toggle. Per group: header (name + COVERAGE %). Per CI: icon, publicId, name, criticality badge, rules count, progress bar (0/100%), View/Add buttons + expandable rule list.

### Right sidebar
- **Coverage by Criticality** (4 bar charts): Critical/High/Medium/Low
- **Coverage by Type** (8 rows): Service, Application, Database, Server, LB, Network, Storage, Endpoint dengan status icon
- **Insights**: critical CI tanpa rule, noisy rules (S/N &lt;0.5), never fired 30d
- **Promo Card**: gradient blue, "Did you know?" tip, "Enable Proactive Scan"

---

## 9. User / UX Flow

### Triage event
1. SRE buka /monitoring/events, filter P1.
2. Klik event → detail.
3. Lihat affected CI di CMDB, related events di correlation key.
4. Acknowledge → status active.
5. Create incident dari event → /incidents/...

### Setup rule
1. Admin /monitoring/rules → New rule wizard.
2. Define: source=prometheus, type=threshold, query="up == 0".
3. Conditions: target CI selector, severity P1, cooldown 10min.
4. Routing: pick alert route.
5. Save → rule enabled.

### Coverage gap
1. Admin /monitoring/coverage → 8 critical CIs no rule.
2. Klik "Suggest a rule" per CI → pilih template.
3. Bulk Create → modal → confirm → rules created.

---

## 10. State Model

```
Event:    open → acknowledged → resolved/suppressed
Rule:     enabled ↔ disabled (also draft state during wizard)
Route:    enabled ↔ disabled
SignOff/Incident: lihat masing-masing module
```

---

## 11. Roles & Permissions

| Permission | Aksi |
|---|---|
| `event.read` | Lihat event/stats |
| `event.write` | Acknowledge/Resolve, ingest |
| `rule.read` | Lihat rule/route |
| `rule.write` | CRUD rule/route |

UI: `useCan('monitoring','update')` gate untuk Create/Edit/Delete; read-only label kalau tidak.

---

## 12. Upstream Dependencies

CMDB (CIs/services) · Users (acknowledgee) · On-Call (escalation recipient).

---

## 13. Downstream Effects

- **Incidents**: create from event → /incidents/{publicId}.
- **Audit log** untuk semua mutation (response envelope `{result, scopeMode}`).
- **Realtime**: `emitEventCreated()` Socket.io broadcast saat ingest.

---

## 14. Data Model

`Event`: id, publicId, type (exception/warning/informational), severity (P1-P4), title, message, source, status, firedAt, lastSeenAt, acknowledgedAt/By, resolvedAt, affectedCIPublicIds[], rulePublicId, linkedIncidentId, correlationKey, payload (Record), tags.

`MonitoringRule`: id, publicId, name, description, enabled, source, type, query, severity, condition (threshold, operator, duration), cooldown, targetMode (explicit/selector), targetCIIds, targetSelector (types/services/environments/tags), targetCount, alertRouteId/PublicId, lastTriggeredAt, totalFires30d, signalToNoiseRatio, tags.

`AlertRoute`: id, publicId, name, description, enabled, matchExpression (severities/sources/tags), channels[], recipients[], escalationSteps[] (id, delayMinutes, recipients, channels), quietHours (enabled, timezone, fromHour/toHour, daysOfWeek), ruleCount, timestamps.

---

## 15. API Endpoints

### Rules & Routes
| Method | Endpoint | Permission |
|---|---|---|
| GET | `/monitoring/rules` | `rule.read` |
| GET | `/monitoring/rules/:publicId` | `rule.read` |
| POST | `/monitoring/rules` | `rule.write` |
| PATCH | `/monitoring/rules/:publicId` | `rule.write` |
| DELETE | `/monitoring/rules/:publicId` | `rule.write` |
| GET | `/monitoring/routes` | `rule.read` |
| GET | `/monitoring/routes/:publicId` | `rule.read` |
| POST | `/monitoring/routes` | `rule.write` |
| PATCH | `/monitoring/routes/:publicId` | `rule.write` |
| DELETE | `/monitoring/routes/:publicId` | `rule.write` |

### Events
| Method | Endpoint | Permission |
|---|---|---|
| GET | `/events` (filter status/severities/ruleId) | `event.read` |
| GET | `/events/dashboard-stats` | `event.read` |
| GET | `/events/:publicId` | `event.read` |
| PATCH | `/events/:publicId/status` | `event.write` |
| POST | `/events/ingest` | `event.write` |

---

## 16. Realtime / Jobs

- **Event ingest** → Socket.io broadcast.
- **Rule evaluator** (external — Prometheus/OTel) → `/events/ingest`.
- **Escalation job**: scan unacknowledged events, fire next escalation step.
- **Audit log** untuk semua mutation.

---

## 17. Open Gaps / TODO

- Scheduling rule evaluation di-host masih di luar Omni (eksternal).
- Coverage scan otomatis ("Enable Proactive Scan") belum diimplementasi.
- SMS/voice channel real integration butuh provider config.
- Comment thread di event timeline belum di-persist (kalau tidak diaudit).

---

**Lihat juga:** [Incidents](./incidents.md) · [CMDB](./cmdb.md) · [On-Call](./on-call.md) · [Capacity](./capacity.md)
