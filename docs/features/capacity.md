# Capacity — Performance & Capacity Management

Status: **Draft**
Route: `/capacity` (dashboard), `/capacity/forecast` (forecast), `/capacity/thresholds` (thresholds)
Sidebar: Service Health & Intelligence · Capacity
Source: `src/routes/capacity/CapacityLayout.tsx`, `CapacityDashboard.tsx`, `CapacityForecast.tsx`, `CapacityThresholds.tsx` · `server/routes/capacity.ts` · `src/types/capacity.ts` · `src/components/capacity/` · `src/lib/constants.ts:407-432` · `src/services/capacityService.ts`

---

## Intent

Pusat **capacity & performance** — **jawab dalam 5 detik: resource mana hampir penuh? kapan akan breach? threshold apa yang perlu di-tune?** SRE melihat utilisasi CPU/Memory 24h & forecast breach ≤14d, capacity planner men-tune threshold/rule, dan approver men-trigger scaling via Change. ITIL 4 Capacity & Performance Management.

---

## Current State (snapshot `src/routes/index.tsx:59-62`, `187-191`)

- `src/routes/index.tsx:59-62` imports `CapacityLayout`, `CapacityDashboard`, `CapacityForecast`, `CapacityThresholds`.
- `src/routes/index.tsx:187-191` → `<CapacityLayout />` at `/capacity` with children:
  - `index` → `<CapacityDashboard />`
  - `forecast` → `<CapacityForecast />`
  - `thresholds` → `<CapacityThresholds />`
- Layout: `src/routes/capacity/CapacityLayout.tsx:13-96` — `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b border-ois-border` + accent `w-1 shrink-0 transition-colors duration-500` color `critical>0 #B42318 : warning>0||imminent>0 #DC6803 : #12B76A` + title `Capacity & Performance text-xl font-bold ois-text` + stats row `text-xs ois-text-muted` with dots `w-1 h-1 rounded-full bg-ois-border-strong` + tab bar 3 `NavLink` (`Gauge 14`, `TrendingUp 14`, `AlertTriangle 14`, active `border-ois-primary text-ois-primary` else muted hover) — `Outlet` owns scroll `flex-1 min-h-0 overflow-auto`.
- Components: `MetricCard`, `CriticalMetricsHero`, `MetricExpandedDetail`, `CapacityChart`, `ForecastChart`, `PredictedBreachAlert`, `ScalingRecommendationCard`, `ScalingRecommendationDetail`, `ThresholdRow`, `ThresholdSeverityPill`, `NewThresholdModal`, `MetricSparkline`, `UtilizationBar`, `TrendIndicator`, `CapacityChart`/`ForecastChart`/`ConfidenceBand` (`src/components/capacity/` — 15 files).
- API: `capacityRouter` (`server/routes/capacity.ts:9-52`) — 5 `GET` endpoints under `/capacity` via `listByKind` + `requirePermission('capacity.read')` + `qBool`/`qString` filters for `critical`, `imminent`, `open`.
- Types: `CapacityResourceType 9` (`cpu|memory|disk|network_bandwidth|db_connections|queue_depth|requests_per_second|storage_iops|concurrent_users`), `CapacityThresholdSeverity info|warning|critical`, `CapacityThreshold operator >|>=|<|<=`, `CapacityForecast predictionMethod linear|seasonal|arima horizon 30|90`, `ScalingRecommendation type scale_up|scale_down|right_size|add_replica|remove_replica priority low|medium|high|urgent status open|acknowledged|in_progress|implemented|dismissed` (`src/types/capacity.ts:3-124`).
- Constants: `capacityResourceTypeMeta` (`src/lib/constants.ts:409-419` label+icon+defaultUnit per resource), `capacityThresholdSeverityMeta` (`421-425` info `#0BA5EC #F0F9FF` / warning `#DC6803 #FFFAEB` / critical `#B42318 #FEF3F2`), `recommendationPriorityMeta` (`427-432` low `#475467 #F1F3F7` / medium `#0BA5EC #F0F9FF` / high `#DC6803 #FFFAEB` / urgent `#B42318 #FEF3F2`).

**Working:**
- Layout: accent computes `critical count (utilizationPercent>=criticalThreshold)`, `warning count (warning≤util<critical)`, `imminent breach count (daysUntilBreach≤30)` via `useResource(() => capacityService.metrics/forecasts/thresholds)` `data ?? []`; header stats `{metrics.length} metrics · {enabled} active thresholds · {critical} critical danger · {warning} warning · {imminent} breach in 30d danger|warning`.
- Dashboard: KPI 4 grid `grid-cols-4 gap-4` — `Avg CPU (24h)`/`Avg Memory (24h)` `avg(utilizationPercent)` `Math.round` `trend 8|3 trendBetter low` + subDetail `No resolved` guard `—`, `Scaling Recs open.length` + `urgent/high split`, `Forecast Alerts ≤14d count`; `CriticalMetricsHero` banner `amber-50 border-amber-200 AlertTriangle 5 amber-500 ATTENTION REQUIRED — N metric at or near threshold` + rows sorted `utilizationPercent desc` with `bg #FEF3F2 critical else #FFFAEB` + `borderColor #F04438|#F79009` + `UtilizationBar showLabel` + `CRITICAL|WARNING — exceeded|at or near` + `View metric →` + `Acknowledge/ Acknowledged Check 12 emerald`; main `flex gap-6 items-start` left `flex-1 min-w-0` `All Capacity Metrics 11px uppercase tracking-wide gray-700` 2-col grid `MetricCard` per metric + inline expanded `col-span-2 MetricExpandedDetail`; right `w-72 shrink-0 sticky top-6 space-y-4` cards: Active Recommendations grouped `urgent|high|medium|low`, Threshold Status `Active enabled/total, Triggering triggerCount30d>0 enabled, Triggered 30d sum`, `ConnectedSourcesPanel domain="capacity" variant="rail"`, Change Linkage 2 hardcoded `CHG-2026-00089 closed green-100 green-700`, `CHG-2026-00091 in review amber-100 amber-700`.
- Forecast: top `flex justify-end gap-2` horizon toggle `30|90` `rounded-md border-gray-200 overflow-hidden` active `bg-blue-600 text-white` else `bg-white text-gray-600 hover:bg-gray-50` + `Generate forecast Button default sm` → toast `Generating {horizon}-day forecast…` 1.5s → `Forecast refreshed`; `grid grid-cols-4 gap-6 items-start` left `col-span-3 space-y-6` predicted breach alerts `imminentForecastsList sorted daysUntilBreach asc` `PredictedBreachAlert` per imminent + `All Forecasts grid-cols-2 gap-4` filtered `forecastHorizonDays===horizonFilter` per `Card` header `metricName + horizon badge purple-100 purple-700 {horizon}d` + `ForecastChart height200` + breach info `Predicted breach locale short + (Already breached|{days} days) red-600` + `Confidence UPPERCASE` + `Method predictionMethod` + recommendation `border-amber-200 bg-amber-50 12px amber-700` + `Implement via change → outline w-full` → toast `Drafting change for {id}` → `navigate('/changes') 500ms`; right `col-span-1 sticky top-6 space-y-4` `Forecast Accuracy Last quarter` `Linear|Seasonal|ARIMA methodAccuracy derived confidence→pct high90 med75 low55 avg` colored `Linear green-700 Seasonal amber-600 ARIMA green-700` + `Default method: Linear 12px gray-500` + `Top Drivers 3 imminent sorted daysUntilBreach` `• metricName — breach in N days`.
- Thresholds: top `flex justify-end gap-2` `Can capacity update` → `+ New threshold Button primary sm` → `NewThresholdModal`; filter bar `flex-wrap gap-3` Search `🔍 left-3 input pl-8 w-48 border-gray-300` placeholder `Search...` on `name|publicId|metricName lower includes` + `FilterDropdown` severity `all|info|warning|critical` + status `all|enabled|disabled` derived `getEnabled(id,fallback) overrides[id]??enabled` + Reset; stats strip `flex-wrap gap-3` pills `rounded-full border px-3 py-1 text-xs font-medium` active `bg-gray-800 text-white border-gray-800` else `bg-white border-gray-300` — `All N`, per severity `ThresholdSeverityPill sm + count bySeverity`, divider `w-px h-4 bg-gray-200`, `Enabled {totalEnabled}` `Disabled {totalDisabled}`; table `rounded-lg border-gray-200 bg-white shadow-sm overflow-hidden` header `flex items-center gap-3 px-4 py-2 border-b bg-gray-50 text-[10px] leading-5 font-semibold uppercase tracking-wide ois-text-subtle` 8 cols `ID w-32|Name/Metric flex-1|Severity w-20|Condition w-24|Duration w-20|Auto-scale w-16 center|Triggers w-16 center|Status w-12 center` → rows `ThresholdRow` per `filteredThresholds sorted triggerCount30d desc` + `enabled effective filtered`, empty `px-4 py-8 text-center text-sm gray-500 No thresholds match`.
- Charts/sparklines: `MetricCard` border left `4px getBorderColor util>=critical #F04438 else warning #F79009 else #12B76A` `rounded-lg border-gray-200 bg-white shadow-sm cursor-pointer hover:shadow-md ring-2 blue-500 when isExpanded`; header `publicId mono 12px gray-400 + resourceMeta.label bg-gray-100 gray-600 rounded-full + name 14px semibold truncate`; CI link `/cmdb/:ciId` `ExternalLink 3 12px blue-600 hover:blue-800`; current `currentValue unit + utilizationPercent%` + `UtilizationBar h-2 bg-gray-100`; trend `TrendIndicator 7d changePercent7d increasing red TrendingUp | decreasing green TrendingDown | stable gray Minus size sm`; `MetricSparkline height40` per `timeSeriesForMetric` `LineChart monotone stroke getLineColor lastValue>=critical #F04438 else warning #F79009 else #12B76A w1.5 dot false`; thresholds `⚠ warningThreshold% amber-600 🔴 criticalThreshold% red-600`.
- All data via `useResource(() => capacityService.metrics/criticalMetrics/thresholds/forecasts/timeSeries/forecastsForMetric/imminentForecasts/recommendations/openRecommendations)` `data ?? []` with no mock fallback (`src/services/capacityService.ts:8-19`, `src/services/core.ts:29-61` `apiFetch` + `useResource`).

**Stub / Partial:**
- `CapacityDashboard`: `urgent/high split` uses `mockScalingRecommendations.filter priority urgent|high status!==dismissed` while `openRecs` already open — count divergence vs `recsByPriority` open-only; `avgCpu/Memory` uses `utilizationPercent` not `avgLast24h`? — spec in `docs/pages/capacity.md` says avg 24h but impl uses current util.
- `CapacityForecast`: `methodAccuracy` derived from `confidence→pct` not actual historical accuracy; `handleGenerateForecast` is UI toast only (no `POST /capacity/forecasts/generate` HTTP); `handleImplementViaChange` navigates `/changes` not `/changes/new?forecastId` linking.
- `CapacityThresholds`: `overrides` local `Record<id,boolean>` + `extraThresholds` appended front — toggle/create not persisted (no `POST /capacity/thresholds` HTTP, no `PATCH .../:id/status`); search omits `description` (legacy `docs/pages/capacity.md` mentions name/metric/publicId only).
- `ForecastChart` hardcoded `today '2026-05-08'` ReferenceLine `x formatDate(today) #1F4FD4 dash 4 2 label Today` — stale fixed date should be `new Date().toISOString().slice(0,10)`; `MetricExpandedDetail` `timeRange 24h|7d|30d` state toggles style but `CapacityChart` not filtered by range (always full series).
- `CriticalMetricsHero` acknowledge is local `Set` + toast (no `PATCH /capacity/metrics/:id/acknowledge`).

**Missing:**
- Mutation endpoints `POST/PATCH/DELETE /capacity/thresholds`, `POST /capacity/forecasts/generate`, `PATCH /capacity/recommendations/:id` (acknowledge/dismiss), `POST /capacity/metrics/:id/acknowledge` — spec in `docs/pages/capacity.md §14 Open Gaps` (Threshold CRUD server belum ada).
- Forecast job linear/seasonal/ARIMA generator + threshold evaluator + recommendation generator described in `docs/pages/capacity.md §13 Realtime/Jobs` but no `server/jobs/capacity*` nor `POST` ingest.
- Auto-scaling execution (policy stored `autoScalingPolicy` only) + auto-create monitoring rule checkbox stored `autoRule` local boolean only.
- Pagination `?page&pageSize` + multi-sort URL persist for thresholds table (currently client sort `triggerCount30d desc` only).

## Primary View — Per Tab

### CapacityLayout (shared chrome)

`-m-6 flex flex-col bg-ois-bg` `calc(100vh - 3.5rem)` + header `bg-ois-surface border-b border-ois-border shrink-0 z-30` contains `w-1` accent `transition-colors duration-500` + `px-6 py-4` title `Capacity & Performance 20px bold ois-text` + `flex items-center gap-3 mt-1 text-xs ois-text-muted flex-wrap` stats `{metrics.length} metrics · {enabled} active thresholds · {critical} critical danger · {warning} warning · {imminent} breach in 30d warning` dots `w-1 h-1 rounded-full bg-ois-border-strong` + tab `nav flex px-4 overflow-x-auto scrollbar-hide` 3 `NavLink px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` + outlet `flex-1 min-h-0 overflow-auto`.

### CapacityDashboard (`/capacity`)

`flex flex-col gap-6 p-6` — KPI row → hero (if critical) → `flex gap-6 items-start` (metrics left + rail right).

**KPI cards:** 4× `KPICard` (`src/components/ui/KPICard.tsx`) — `label 11px uppercase tracking-wider muted`, `value` large, `trendBetter low` for CPU/Memory, neutral for others. Values: `Avg CPU (24h) Math.round(sum cpu util / count)??— " vs prev week" trend 8`, `Avg Memory similarly 3`, `Scaling Recs open.length subDetail urgent/high`, `Forecast Alerts filtered daysUntilBreach≤14 length subDetail Within 14 days`.

**CriticalMetricsHero:** `src/components/capacity/CriticalMetricsHero.tsx:37-132` — banner `rounded-lg border-amber-200 bg-amber-50 px-4 py-3 flex gap-2 AlertTriangle 5 amber-500 ATTENTION REQUIRED — N metric(s) at or near threshold 14px semibold amber-800` + rows `rounded-lg border overflow-hidden` `getBgColor #FEF3F2 critical else #FFFAEB` `borderColor #F04438|#F79009` `textColor #B42318|#B54708` `severityLabel CRITICAL|WARNING` `thresholdLabel exceeded critical (X%)|at or near warning (X%)` + header `publicId mono 12px textColor + name 14px semibold gray-900 + utilizationPercent% 14px bold textColor` + `UtilizationBar showLabel` + severity line `12px medium textColor` + actions `View metric → border textColor rounded-md px-2.5 py-1 12px` + `Acknowledge bg-white border-gray-300` vs `Acknowledged Check 12 border-emerald-200 bg-emerald-50 emerald-700` + `ToastView top-right bg-ois-primary 2s`.

**MetricCard:** `src/components/capacity/MetricCard.tsx:22-97` — `rounded-lg border-gray-200 bg-white shadow-sm overflow-hidden cursor-pointer hover:shadow-md` `borderLeftWidth 4 borderLeftColor getBorderColor #F04438|#F79009|#12B76A` `isExpanded ring-2 ring-blue-500` `p-4 space-y-3`: header `publicId mono 12px gray-400 + resourceMeta.label gray-100 gray-600 rounded-full + name 14px semibold truncate` + CI link `/cmdb/:ciId` blue; current `flex justify-between text-xs gray-500 Current: {currentValue} {unit} + {utilizationPercent}% semibold` + `UtilizationBar`; trend+peaks `TrendIndicator sm + Peak 24h peakLast24h% + 7d peakLast7d%` `12px gray-500`; `MetricSparkline metricId height40`; thresholds `Thresholds: ⚠ warning% amber ⚴ critical% red 12px`. Click toggles `expandedMetricId` → inline `MetricExpandedDetail`.

**MetricExpandedDetail:** `src/components/capacity/MetricExpandedDetail.tsx:15-107` — `rounded-lg border-gray-200 bg-white shadow-md overflow-hidden col-span-2` header `flex justify-between px-4 py-3 border-b bg-gray-50 name 14px semibold gray-900 + X 4 rounded-md hover:gray-200` + body `p-4 space-y-4`: range selector `24h|7d|30d` `px-3 py-1 rounded-md text-xs font-medium` active `bg-blue-50 text-blue-700 border-blue-200` else `gray-500 hover:gray-50 transparent`; `CapacityChart metricId height220 showThresholds showBaseline`; linked rules `Linked monitoring rules 11px uppercase tracking-wide gray-500` per `monitoringRulePublicIds → Link /monitoring/rules rounded-md border-blue-200 bg-blue-50 px-2 py-0.5 text-xs mono blue-700 hover:blue-100`; forecast `rounded-md border-amber-200 bg-amber-50 px-3 py-2 Predicted breach X locale short + (Already breached|{days} days) 12px amber-600 View forecast underline /capacity/forecast`.

**CapacityChart:** `src/components/capacity/CapacityChart.tsx:52-136` — `ResponsiveContainer 100% h` `AreaChart margin 10,16,0,0 data timeSeriesForMetric mapped date formatDate short + value` `defs linearGradient grad-{metricId} #12B76A 0.25→#F04438 0.05` `CartesianGrid dash 3 3 #F1F3F7` `XAxis date 11px #667085 preserveStartEnd` `YAxis value+unit width 60 11px` `Tooltip CustomTooltip label+value` + `ReferenceLine warning #F79009 dash 4 2 label Warning` + `critical #F04438` + `baseline #98A2B3 if showBaseline && baselineValue defined` + `capacity #667085 Capacity` + `Area monotone dataKey value stroke #1F4FD4 w2 fill url(grad) isAnimation false`.

**Right rail:**

- **Active Recommendations** `Card p-4 space-y-3 h3 14px semibold gray-800` per priority grouping `urgent|high|medium|low` only if `recs.length>0` header `12px semibold gray-500 uppercase tracking-wide` + `ScalingRecommendationCard compact` per rec + `View all → /capacity/forecast 12px primary-600` (`CapacityDashboard.tsx:35-48` `recsByPriority`).
- **Threshold Status** `Card p-4 space-y-2 h3` `Active enabled/total 14px gray-600 flex justify-between font-medium gray-800`, `Triggering now triggeringThresholds.length orange-600`, `Triggered (30d) totalTriggerCount30d gray-800` + `Manage → /capacity/thresholds`.
- **ConnectedSourcesPanel** `domain="capacity" variant="rail"` — details in `src/components/platform/ConnectedSourcesPanel.tsx`.
- **Change Linkage** `Card p-4 space-y-3 h3 + 12px gray-500 Capacity-driven changes` 2 `li flex justify-between items-center` `CHG- link mono 12px blue-600 → /changes/:id + desc 12px gray-500 order replicas|pgbouncer + badge 12px medium closed green-100 green-700 | in review amber-100 amber-700` + `View change history → 12px blue-600`.

### CapacityForecast (`/capacity/forecast`)

`flex flex-col gap-6 p-6` — top horizon toggle + `Generate forecast` right-aligned `flex justify-end gap-2` → `grid grid-cols-4 gap-6 items-start` left `col-span-3 space-y-6` (breach alerts + forecast grid) right `col-span-1 sticky top-6 space-y-4` (accuracy + drivers) + `ToastView`.

**Top bar:** `flex rounded-md border-gray-200 overflow-hidden` `30 days|90 days` buttons `px-3 py-1.5 text-sm font-medium transition-colors border-l #1F4FD4` active `bg-blue-600 text-white` (`CapacityForecast.tsx:82-113` `horizonFilter state 30|90`) + `Button default sm Generate forecast disabled isGenerating → toast`.

**Predicted Breach Alerts:** `if imminentBreaches.length>0` header `text-sm font-bold text-red-700 uppercase tracking-wide ⚠ N PREDICTED BREACHES — Action recommended` + `space-y-3` per `PredictedBreachAlert` (`PredictedBreachAlert.tsx:11-118`) 4 tiers:
- `days===0` Already Breached: `rounded-lg border-red-300 bg-red-50 p-4 space-y-2` `AlertCircle 4 red-700 font-bold 14px CRITICAL — Already breached` + name `14px red-700 medium` + `Currently X% utilized 12px red-600` + recommendation `12px red-600` → `View forecast border-red-300 red-700 hover:red-100`.
- `days≤5` Urgent: `border-red-200 bg-red-50 Flame 4 red-600 URGENT — Breach within N day(s) 14px bold` + name + `X% utilized → predicted breach at locale 12px red-600` + `Confidence UPPERCASE 12px medium uppercase red-600` + recommendation `red-500` → `View forecast + Take action default sm navigate(/changes)`.
- `days≤14` High: `border-amber-200 bg-amber-50 AlertTriangle 4 amber-700 HIGH — Breach within N days` + similarly amber-700/600/500 + same buttons amber.
- `days>14` returns `null` — not rendered (logic gap: `days>14` filtered out at parent `imminentFilter≤14` so never hits).

**Forecast Cards Grid:** `space-y-4 h2 All Forecasts uppercase tracking-wide gray-700 + grid grid-cols-2 gap-4` filtered `filteredForecasts= mockForecasts.filter horizon===filter` (`CapacityForecast.tsx:74-76`) per `Card p-4 space-y-3`: header `metricName 14px semibold gray-900 + horizon badge purple-100 purple-700 {days}d rounded-full px-2 py-0.5 12px medium`; `ForecastChart forecast metric height200` (`ForecastChart.tsx:73-198` see below); breach `Predicted breach: short locale red-600 + (Already breached|N days) gray-500 12px gray-600` conditional `predictedBreachDate && daysUntilBreach!|0`; `Confidence UPPERCASE confidence`; `Method predictionMethod`; recommendation `rounded-md border-amber-200 bg-amber-50 px-3 py-2 12px amber-700 if recommendation`; `Implement via change → outline sm w-full onClick handleImplementViaChange forecastId toast + navigate(/changes)`.

**ForecastChart:** `src/components/capacity/ForecastChart.tsx:73-198` — `ResponsiveContainer 100% h` `ComposedChart margin 10,16,0,0 data merged historical+forecast sorted date` `historicalPoints from timeSeriesForMetric value vs forecastPoints predictions predictedValue/confidenceLowerUpper capacityValue` `defs linearGradient conf-band-grad #6941C6 0.15→0.03` `CartesianGrid dash 3 3 #F1F3F7` `XAxis displayDate 10 #667085 preserveStartEnd` `YAxis 10 #667085 width 50` `Tooltip CustomTooltip actual+predicted+[lower–upper]` + `Area lowerBound none + Area bandHeight stackId conf url(#conf-band-grad) baseValue dataMin` + `ReferenceLine warning #F79009 dash 4 2 label Warning | critical #F04438 | Today #1F4FD4 x formatDate(today hardcoded 2026-05-08 dash 4 2)` + `Line historical monotone #1F4FD4 w2` + `Line predicted monotone #6941C6 w2 dash 5 3` all `dot false isAnimation false`.

**Right rail:**

- **Forecast Accuracy** `Card p-4 space-y-3 h3 14px semibold + Last quarter: 12px gray-500 medium + div 12px mono gray-600 flex justify-between` Linear `90% accurate green-700|gray-400` Seasonal `75% amber-600` ARIMA `55% green-700 (slow)` derived `methodAccuracy avg per method` + `Default method: Linear 12px gray-500 pt-1`.
- **Top Drivers** `Card p-4 space-y-3 h3 + Imminent breaches: 12px gray-500 medium` `ul space-y-1.5 12px gray-600` top 3 `slice(0,3)` sorted `daysUntilBreach asc` `• metricName — breach in N days semibold gray-800` else `No imminent breaches gray-400`.

### CapacityThresholds (`/capacity/thresholds`)

`flex flex-col gap-6 p-6` — top `+ New threshold` → filter bar → stats strip → table → modal + toast.

**Top:** `flex justify-end gap-2` `Can module="capacity" action="update"` `Button primary sm + New threshold → setIsModalOpen true`.

**Filter Bar:** `flex items-center gap-3 flex-wrap` search `relative left-3 🔍 text-gray-400 14px input pl-8 pr-3 py-1.5 text-sm rounded-md border-gray-300 bg-white focus:border-blue-500 w-48 Search...` + `FilterDropdown severity all|info|warning|critical` + `FilterDropdown status all|enabled|disabled` + `Reset button 14px gray-500 hover:gray-700` → `setSearchQuery|severityFilter|statusFilter` empty (`CapacityThresholds.tsx:94-136`).

**Stats Strip:** `flex items-center gap-3 flex-wrap` pills `rounded-full px-3 py-1 text-xs font-medium border transition-colors` active `bg-gray-800 text-white border-gray-800` else `bg-white text-gray-600 hover:gray-50`: `All N` onClick `setSeverity all` active `severity===all && status===all`, per severity `ThresholdSeverityPill severity size sm + countBySeverity sev count` 3 buttons onClick `setSeverity sev`, divider `w-px h-4 bg-gray-200`, `Enabled N` `Status enabled` `onClick status enabled`, `Disabled N` — derived `totalEnabled filter getEnabled enabled, totalDisabled length-totalEnabled, countBySeverity filter severity` (`CapacityThresholds.tsx:73-77`).

**Thresholds Table:** `rounded-lg border-gray-200 bg-white shadow-sm overflow-hidden` header `flex items-center gap-3 px-4 py-2 border-b bg-gray-50 text-[10px] leading-5 font-semibold uppercase tracking-wide gray-500`: cols `ID w-32|Name/Metric flex-1|Severity w-20|Condition w-24|Duration w-20|Auto-scale w-16 center|Triggers w-16 center|Status w-12 center` (`CapacityThresholds.tsx:191-194`) → rows `thresholdsWithEffectiveEnabled sorted triggerCount30d desc already filtered by getEnabled status, severity, search name|publicId|metricName lower includes` (`51-71`) per `ThresholdRow` (`ThresholdRow.tsx:10-72`) else empty `px-4 py-8 text-center 14px gray-500 No thresholds match`. Row `flex items-center gap-3 px-4 py-3 border-b hover:bg-gray-50 text-sm`: `publicId mono 12px gray-400 w-32`, `name medium gray-900 truncate + metricName 12px gray-500 flex-1 min-w-0`, `ThresholdSeverityPill sm w-20`, `operator thresholdValue% font-mono gray-700 conditionally % if metricName includes %|cpu|mem w-24`, `durationMinutes m 12px gray-500 w-20`, `autoScalingEnabled ? Check 4 green-500 : — gray-400 w-16 center`, `triggerCount30d 12px gray-600 center w-16`, switch `role switch aria-checked enabled relative h-5 w-9 rounded-full transition-colors bg-blue-600|gray-300 focus:ring-2 focus:ring-blue-500` `span h-3.5 w-3.5 rounded-full bg-white shadow translate-x-4|1` `w-12 justify-center` `onClick onToggle(id,!enabled)` gated `canEdit via useCan('capacity','update') else ()=>{}`.

**NewThresholdModal:** `src/components/capacity/NewThresholdModal.tsx:15-239` props `isOpen onClose metrics onCreated` — `Modal isOpen onClose title New Threshold size md` `space-y-6 py-4`: Name `* Input placeholder Payment CPU high warning value name onChange` req `disabled !name`, Description `Input optional`; section `WHAT TO MONITOR SectionLabel border-t gray-200 bg-white pr-3 text-xs semibold tracking-wider gray-400`: metric select `select w-full rounded-md border-gray-300 bg-white px-3 py-2 text-sm gray-800 value metricId onChange` options `publicId — name` default `— select a metric —`; `WHEN TO TRIGGER`: Severity radio `info|warning|critical` `input radio name severity checked severity===value` 3 labels; Condition row `value 12px gray-600 + > border gray-300 px-2 py-1 mono gray-700 bg-gray-50 + number input w-20 value thresholdValue onChange + % + for at least + input w-16 duration + minutes`; `WHAT TO DO`: Alert route `Input value ROUTE-CRITICAL-PROD default`, Auto-scaling checkbox `checked autoScaling onChange + Policy Input if autoScaling placeholder scale-up-2-replicas value scalingPolicy`; `LINK TO MONITORING`: `Auto-create monitoring rule checkbox autoRule`; Footer `flex justify-end gap-2 pt-2 border-t gray-100 Ghost Cancel → onClose + Primary Create disabled !name → handleCreate: find metric by metricId fallback metrics[0], now ISO, id thr-{Date.now()}, publicId THR-{slice-6}, construct CapacityThreshold severity operator > thresholdValue Number durationMinutes Number alertChannel autoScalingEnabled autoScalingPolicy enabled true triggerCount30d 0 linkedRuleIds [] ownerId user-current ownerName You createdAt/updatedAt now → onCreated(setExtraThresholds prev [thr,...prev] + toast Created) + resetForm + onClose`.

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| View metrics dashboard | Open `/capacity` | `capacity.read` | — |
| View forecast | Tab `Forecast` `/capacity/forecast` + horizon toggle | `capacity.read` | — |
| Generate forecast | `Generate forecast` `Button default sm` `handleGenerateForecast` | `capacity.read` | — (currently toast only) |
| Implement via change | Card `Implement via change → outline` `handleImplementViaChange` `navigate('/changes')` | `capacity.read` | forecast exists |
| Acknowledge critical metric | `CriticalMetricsHero Acknowledge` → `Acknowledged Check emerald` local | `capacity.read` | metric in `criticalMetrics` |
| Expand metric detail | `MetricCard onClick` toggles `expandedMetricId` | `capacity.read` | — |
| View CI detail | `MetricCard → /cmdb/{ciId}` `ExternalLink 3` | `cmdb.read` | ciId exists |
| View forecast from detail | `MetricExpandedDetail View forecast` `Link /capacity/forecast` | `capacity.read` | forecast with `predictedBreachDate` |
| Search/filter thresholds | Input `name|publicId|metricName` + `FilterDropdown` severity/status | `capacity.read` | — |
| Toggle threshold enabled | `ThresholdRow switch` `onToggle(id,!enabled)` `overrides[id]=enabled` | `capacity.update` (`useCan('capacity','update')`) | — (local optimistic, not `check if canEdit else no-op`) |
| Create threshold | `+ New threshold` → `NewThresholdModal` `Create` | `capacity.update` (`Can capacity update`) | name non-empty (`disabled !name`) |
| Reset filters | `Reset` clears `searchQuery, severity all, status all` | `capacity.read` | filters active |
| View monitoring rule | `MetricExpandedDetail linkedRuleIds → /monitoring/rules` | `monitoring.read` | ruleIds non-empty |
| Filter by stats pill | Click `All/info/warning/critical|Enabled|Disabled` pills sets severity/status | `capacity.read` | — |

Delegate ke [`_shared/filter-sort-export.md`](./_shared/filter-sort-export.md) saat shared tersedia (search `FilterDropdown` pattern), [`_shared/routing.md`](./_shared/routing.md) untuk Module Layout 3-tab routing.

## Filters / Sort / Search

- **Thresholds search:** `searchQuery` on `name|publicId|metricName lower includes` `useMemo allThresholds=[...extraThresholds,...server]` — client-side, no debounce, `w-48` (`CapacityThresholds.tsx:58-68`). Omits `description` (gap vs legacy).
- **Severity filter:** `severityFilter all|info|warning|critical` via `FilterDropdown` + stats pill click `setSeverityFilter sev` — active `severityFilter===sev`. Counts via `countBySeverity allThresholds.filter severity===sev length`.
- **Status filter:** `statusFilter all|enabled|disabled` via `FilterDropdown` + pills `Enabled/Disabled`. Effective enabled `getEnabled(id,fallback)=overrides[id]??fallback` — toggle writes `overrides` not server. Filter checks `isEnabled status ensabled vs disabled`.
- **Sort:** fixed `b triggerCount30d - a triggerCount30d` desc — no column sort toggle (vs `cmdb`/`availability` column sort). No `?severity=` query persist — all in local state (should migrate to URL `?search&severity&status` like `incidents`).
- **Dashboard/Forecast:** no search; Forecast horizon toggle `30|90` local `horizonFilter` filters `mockForecasts horizonDays===filter`; `imminent` sort `daysUntilBreach asc` for alerts + top drivers `slice 0,3`; `Forecast Alerts` KPI counts `≤14d`.
- **Global range:** no `24h|7d|30d` range persist in URL (like `overview` timeRange) — `MetricExpandedDetail` `timeRange` visual only, not wired to `CapacityChart` query.

## Detail View

No dedicated `/capacity/:metricId` page — detail is inline expand `MetricExpandedDetail` `col-span-2 px-4` inside dashboard grid (`CapacityDashboard.tsx:120-126`).

- **Header:** `flex justify-between px-4 py-3 border-b bg-gray-50` `name 14px semibold gray-900` + `X 4 rounded-md gray-400 hover:gray-600 hover:gray-200 aria Close`.
- **Range toggle:** `24h|7d|30d` styled `px-3 py-1 rounded-md 12px medium` active `bg-blue-50 border-blue-200 text-blue-700`.
- **Chart:** `CapacityChart metricId height220 showThresholds showBaseline` — `useResource timeSeriesForMetric` historical actual values + `capacityValue/warningThreshold/criticalThreshold/baselineValue` reference lines.
- **Linked monitoring rules:** if `monitoringRulePublicIds.length>0` header `11px medium uppercase tracking-wide gray-500 Linked monitoring rules` + `flex-wrap gap-2` per `Link /monitoring/rules rounded-md border-blue-200 bg-blue-50 px-2 py-0.5 12px mono blue-700 hover:blue-100`.
- **Forecast breach:** if `primaryForecast && predictedBreachDate` `rounded-md border-amber-200 bg-amber-50 px-3 py-2` + label `12px medium amber-700 Predicted breach` + date locale short bold amber-700 + `(Already breached|N days) 12px amber-600` + `View forecast underline /capacity/forecast`.

Ref: [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md) when shared available — capacity uses inline drawer not 3-column; future parity: extract to right drawer `w-[450px]` like `availability/OutageDetailDrawer`.

## State Lifecycle

```
CapacityMetric: utilizationPercent derived (currentValue/capacityValue*100) — read-only snapshot.
  warning/critical thresholds are static per metric (warningThreshold, criticalThreshold).
  trend7d increasing|decreasing|stable with changePercent7d|30d.

CapacityThreshold: enabled true ↔ false (toggle switch, local overrides until POST).
  triggerCount30d increment via job evaluator; lastTriggeredAt ISO when fired.

CapacityForecast: generatedAt → predictions 30|90 days with predictedBreachDate + daysUntilBreach + confidence low|medium|high.
  Imminent tiers: Already Breached days==0 (red #F04438 AlertCircle) → Urgent ≤5d (red #F04438 Flame) → High ≤14d (amber #F79009 AlertTriangle) → Info >14d (not rendered).
  predictionMethod linear (90%) | seasonal (75%) | arima (55% slow).

ScalingRecommendation: open → acknowledged → in_progress → implemented | dismissed
  open: derived from forecasts+threshold history (daysUntilCriticalIfIgnored, estimatedCostMonthlyUSD)
  acknowledged: local/by user; in_progress: linked implementedViaChangeId → /changes; dismissed: dismissedReason italic gray
  Other: triggerCount? n/a; expiresAt optional → regenerate via forecast job.
```

Toggle lifecycle: `overrides[id] = !enabled` optimistic no rollback (server not yet). Create `extraThresholds` prepend `[threshold,...prev]` — no dedupe.

Guard: `Reset` clears search/severity/status; empty filtered `No thresholds match` fallback.

Ref meta `src/lib/constants.ts#recommendationPriorityMeta` + `capacityThresholdSeverityMeta` (colors per priority/severity).

## Permissions (action-level)

| Action | Permission | Who | Notes |
|--------|------------|-----|-------|
| View dashboard/forecast/thresholds/metrics/time-series | `capacity.read` | All authenticated (via `capacityRouter.use('/capacity', requirePermission('capacity.read'))` `server/routes/capacity.ts:12`) | Server `listByKind` tenant-isolated `req.tenantId`; scope violation → 403 `scope_violation` |
| Toggle threshold enabled | `capacity.update` — UI `useCan('capacity','update')` `CapacityThresholds.tsx:15` + `ThresholdRow onToggle canEdit ? handleToggle : ()=>{}` | Owner / Platform Admin (gate NewThresholdModal `Can capacity update`) | Local optimistic only — no server write yet |
| Create/edit threshold | `capacity.update` (TBD by tenant) — UI `Can module="capacity" action="update"` in `CapacityThresholds.tsx:87` wraps `+ New threshold` | Same | Stub — `POST /capacity/thresholds` missing; `docs/pages/capacity.md §12` says POST/PATCH/DELETE not yet in server |
| Generate forecast / Implement via change | `capacity.read` + `change.create` for implement | Any reader can invoke toast/navigate but real `POST /capacity/forecasts/generate` not guarded yet |

No `capacity.write|delete` separate — single `read` + `update` split like `availability`. `requirePermission` global via `server/app.ts:126` `withScopedDb` context (`req.tenantId`, `req.permissions`). Legacy `docs/pages/capacity.md §8` permission `capacity.read` all, `capacity.update (TBD)` for create/edit — matches layout gate.

UI gate pattern: `useCan('capacity','update')` → local switch handler vs no-op; `Can` wrapper hides `+ New threshold` if lacking perm.

## Empty / Loading / Error

- **Empty KPIs no metrics:** `avgCpuPct==null ? — : {pct}%` + `avgMemory —`; `openRecs.length 0 → subDetail 0 urgent · 0 high`; `forecastAlerts 0`; `CriticalMetricsHero sorted.length===0 return null` (`CriticalMetricsHero.tsx:47`) — no banner (correct).
- **Empty metrics grid:** `mockCapacityMetrics.map` empty → grid `0` cards, header `All Capacity Metrics` still renders (no empty state text — gap vs `cmdb` `No CIs match`).
- **Empty recommendations:** `Object.entries(recsByPriority).map` empty → section `Active Recommendations h3` still + `View all →` link only; no `No recommendations ✓`.
- **Empty thresholds table:** `thresholdsWithEffectiveEnabled.length===0 → px-4 py-8 text-center 14px gray-500 No thresholds match the current filters.` (`CapacityThresholds.tsx:205-207`) — pills still show `0`.
- **Forecast empty:** `filteredForecasts.length 0 → grid grid-cols-2 gap-4` empty, `All Forecasts` header still; `imminentBreaches.length==0` hides `Predicted Breaches` hero; `topDriverForecasts.length==0 → li gray-400 No imminent breaches` (`CapacityForecast.tsx:259`); `methodAccuracy[method]==null → —` `text-gray-400` else `% accurate`.
- **Loading:** `useResource` → `data null` → `?? []` → zero-state renders (no skeleton/shimmer unlike `cmdb` or `incidents` — parity gap). `isGenerating true → button disabled Generating…` only.
- **Error:** no banner — failure → silent empty (should show `Retry` via `useResource error` — gap vs `src/services/core.ts:72-94` error state).
- **No service/forecast/metrics data:** `avg null → —`, heatmap `services.map` empty → no rows; `MetricSparkline series.length===0 return null` (`MetricSparkline.tsx:25`); `CapacityChart rawData ?? []` → empty `AreaChart` with axes but no area.

## Phase 2 Deferred

- Threshold CRUD `POST/PATCH/DELETE /capacity/thresholds` + `time-series` ingest `POST /capacity/time-series` — rationale: current 5 `GET` only (`capacity.ts:13-52`) + modal creates local `extraThresholds` only.
- Forecast generation `POST /capacity/forecasts/generate` job (linear/seasonal/arima) + confidence calibration — rationale: `handleGenerateForecast` is 1.5s toast mock; `methodAccuracy 90/75/55` static not computed from `last quarter` real.
- Threshold evaluator job `evaluate metric stream vs threshold duration window → monitoring event` + recommendation generator derived from forecast+threshold history.
- Auto-scaling policy execution (`autoScalingEnabled + autoScalingPolicy → POST /autoscale`) + auto-create monitoring rule checkbox wire to `POST /monitoring/rules`.
- Time-series resolution configurability (per `docs/pages/capacity.md §14`) + `MetricExpandedDetail timeRange 24h|7d|30d` filter wiring to `capacityService.timeSeriesForMetric` query param `?range=`.
- Pagination `?page&pageSize` + multi-sort URL persist for thresholds table `?search&severity&status&sort=triggerCount desc`.
- Recommendation state actions `acknowledge/dismiss/in_progress via change` endpoints `PATCH /capacity/recommendations/:id` + expiry `expiresAt` job.
- Predefined threshold templates per resourceType + bulk import thresholds CSV/JSON.

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/capacity/` + `src/components/capacity/` + `docs/pages/capacity.md`):

1. **Layout** `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b border-ois-border` + left `w-1` accent dynamic `#B42318|#DC6803|#12B76A` transition 500ms (`CapacityLayout.tsx:32-35`). Jangan ganti ke `Module Layout` lain.
2. **Tabs** `NavLink Gauge|TrendingUp|AlertTriangle 14px px-3 py-3 border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` (`CapacityLayout.tsx:71-81`).
3. **KPICard** `grid-cols-4 gap-4` + `label Avg CPU (24h)|Avg Memory (24h)|Scaling Recs|Forecast Alerts` + `trendBetter low` for perf + `subDetail urgent/high or Within 14 days` (`CapacityDashboard.tsx:68-92`).
4. **CriticalMetricsHero** sorted `utilizationPercent desc` banner `amber-50 AlertTriangle 5 amber-500 14px semibold amber-800` + row `borderColor #F04438|#F79009 bg #FEF3F2|#FFFAEB text #B42318|#B54708` + `UtilizationBar showLabel` + `CRITICAL|WARNING — exceeded|at or near` (`CriticalMetricsHero.tsx:12-34`, `52-57`).
5. **MetricCard** `borderLeftWidth 4 borderLeftColor #F04438|#F79009|#12B76A` `rounded-lg border-gray-200 bg-white shadow-sm hover:shadow-md ring-2 blue-500 when expanded` + header `publicId mono 12px gray-400 + resource badge gray-100 gray-600 + name 14px semibold` + CI link `font-mono 12px blue-600 ExternalLink 3 → /cmdb/:ciId` + `TrendIndicator sm` + `MetricSparkline stroke colored` (`MetricCard.tsx:16-20`, `22-33`).
6. **UtilizationBar** `flex gap-2 h-2 bg-gray-100 rounded-full overflow-hidden w ${clamped}% bg getBarColor + label 12px gray-700 ${value.toFixed(0)}% if showLabel` (`UtilizationBar.tsx:11-41`) — jangan ganti thickness.
7. **MetricExpandedDetail** inline `col-span-2 rounded-lg border-gray-200 bg-white shadow-md overflow-hidden` header `gray-50 px-4 py-3 border-b + X 4` + range toggle `bg-blue-50 text-blue-700 border-blue-200 when active` + `CapacityChart height220 showThresholds showBaseline` + `Linked rules blue-50 blue-700 Link /monitoring/rules` + `Predicted breach amber-50 amber-700 View forecast` (`MetricExpandedDetail.tsx:21-107`).
8. **CapacityChart** `AreaChart grad-{metricId} #12B76A 0.25→#F04438 0.05` + `ReferenceLine Warning #F79009 dash 4 2 | Critical #F04438 | Baseline #98A2B3 | Capacity #667085` + `Area monotone stroke #1F4FD4 w2 fill gradient dot false` (`CapacityChart.tsx:69-135`).
9. **ForecastChart** `ComposedChart Area lowerBound none + Area bandHeight stackId conf url(#conf-band-grad #6941C6 0.15–0.03) + ReferenceLine warning #F79009 | critical #F04438 | Today #1F4FD4 dash 4 2 + Line historical #1F4FD4 w2 | predicted #6941C6 w2 dash 5 3` (`ForecastChart.tsx:108-197`). Fixed `Today marker` warna `1F4FD4` — jangan ganti.
10. **PredictedBreachAlert** 4 tiers `Already Breached AlertCircle red-700 | Urgent Flame red-600 ≤5d | High AlertTriangle amber-700 ≤14d` `rounded-lg border p-4 space-y-2` + `confidence UPPERCASE` + `View forecast + Take action → /changes` (`PredictedBreachAlert.tsx:18-118`) — color mapping `red-50|amber-50 + red-300|red-200|amber-200` jangan desaturate.
11. **ThresholdRow** `flex gap-3 px-4 py-3 border-b hover:bg-gray-50 last:border-0 text-sm` cols `ID mono w-32 | Name/Metric flex-1 | Severity ThresholdSeverityPill w-20 | Condition mono w-24 operator value% | Duration w-20 m | Auto-scale Check green | Triggers center | Status switch h-5 w-9 bg-blue-600|gray-300 translate-x-4|1` (`ThresholdRow.tsx:12-70`).
12. **ThresholdSeverityPill** `rounded-full px-1.5 py-0.5 text-xs|sm` `color capacityThresholdSeverityMeta color bg` info `#0BA5EC #F0F9FF` warning `#DC6803 #FFFAEB` critical `#B42318 #FEF3F2` (`ThresholdSeverityPill.tsx:11-22` `capacityThresholdSeverityMeta` exact hex).
13. **NewThresholdModal** sections `SectionLabel border-t gray-200 + uppercase tracking-wider gray-400 bg-white pr-3` dividers `WHAT TO MONITOR → WHEN TO TRIGGER → WHAT TO DO → LINK TO MONITORING` + condition row `value > X% for Y minutes` + alert route `ROUTE-CRITICAL-PROD` default + policy input if autoScaling (`NewThresholdModal.tsx:103-213`).
14. **ScalingRecommendationCard** `borderLeftWidth 4 borderLeftColor priority low #98A2B3 med #1F4FD4 high #F79009 urgent #F04438` + `priorityMeta label+color bg` + `statusMeta open #1F4FD4 #EEF2FF | acknowledged #0BA5EC #F0F9FF | in_progress #DC6803 #FFFAEB | implemented #067647 #ECFDF3 | dismissed #475467 #F1F3F7` + compact `flex gap-3 px-3 py-2 border-gray-200 bg-white rounded-lg` with clock `daysUntilCriticalIfIgnored 12px gray-500` (`ScalingRecommendationCard.tsx:12-55`).
15. **TrendIndicator** `increasing TrendingUp red-600 +{pct}% | decreasing TrendingDown green-600 -{pct}% | stable Minus gray-500 ±{pct}%` `size sm h-3 w-3 text-xs` (`TrendIndicator.tsx:14-36`).
16. **MetricSparkline** `ResponsiveContainer 100% h 40 LineChart Line monotone stroke getLineColor lastValue threshold w1.5 dot false` (`MetricSparkline.tsx:30-42`).
17. **Stats pills** `rounded-full border px-3 py-1 text-xs font-medium` active `bg-gray-800 text-white border-gray-800` + badge `rounded-full px-1.5` counts per severity/status (`CapacityThresholds.tsx:142-187`, `CapacityForecast stats similarly`).
18. **Colors** keep `capacityResourceTypeMeta` + `capacityThresholdSeverityMeta` + `recommendationPriorityMeta` exact hex — jangan map ke token generik tanpa alias. Tokens `ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-border #E4E7EC`.

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Hook | Endpoint | Permission | Notes |
|------|----------|------------|-------|
| `capacityService.metrics()` | `GET /api/v1/capacity/metrics` | `capacity.read` | `listByKind<CapacityMetric>(tenantId,'capacity-metric')` `server/routes/capacity.ts:19` all |
| `capacityService.criticalMetrics()` | `GET /api/v1/capacity/metrics?critical=true` | `capacity.read` | `:21` `qBool(req.query.critical) ? filter isCritical util>=criticalThreshold` |
| `capacityService.thresholds()` | `GET /api/v1/capacity/thresholds` | `capacity.read` | `listByKind<CapacityThreshold>(...,'capacity-threshold')` `:24` |
| `capacityService.forecasts()` | `GET /api/v1/capacity/forecasts` | `capacity.read` | `listByKind<CapacityForecast>(...,'capacity-forecast')` `:28` all |
| `capacityService.forecastsForMetric(metricId)` | `GET /api/v1/capacity/forecasts?metricId=` | `capacity.read` | `:31` `qString(req.query.metricId) ? filter metricId===query` |
| `imminentForecasts()` | `GET /api/v1/capacity/forecasts?imminent=true` | `capacity.read` | `:32-35` `SOON_MS 14*86_400*1000` filter `predictedBreachDate && dateMs - now <14d` |
| `capacityService.timeSeries()` | `GET /api/v1/capacity/time-series` | `capacity.read` | `listByKind<CapacityDataPoint>(...,'capacity-time-series')` `:41` all |
| `capacityService.timeSeriesForMetric(metricId)` | `GET /api/v1/capacity/time-series?metricId=` | `capacity.read` | `:43` `filter p.metricId===query` if query present |
| `capacityService.recommendations()` | `GET /api/v1/capacity/recommendations` | `capacity.read` | `listByKind<ScalingRecommendation>(...,'scaling-rec')` `:47` all |
| `capacityService.openRecommendations()` | `GET /api/v1/capacity/recommendations?open=true` | `capacity.read` | `:51` `qBool(req.query.open) ? filter String(status)==='open'` runtime string check (older type union compat) |

All via `src/services/capacityService.ts:8-19` `apiFetch('/capacity/...')` + `src/services/core.ts:29-61` `apiFetch`. Tenant-scoped `req.tenantId` + `listByKind` documents store (JSON serialized columns future `jsonb` per `AGENTS.md`). Socket: none yet (future `tenant:{tenantId}` metric/forecast refresh).

## Open Items

- [ ] Add `POST /capacity/thresholds` + `PATCH /capacity/thresholds/:publicId` + `DELETE /:id` (`createCapacityThresholdSchema`) — verify `capacity-threshold` `kind` mapping in documents repo; wire `NewThresholdModal handleCreate` from `extraThresholds` local to HTTP.
- [ ] Replace `ForecastChart` hardcoded `today '2026-05-08'` with `new Date().toISOString().slice(0,10)` derived; similarly dashboard `now` not used for deterministic tests.
- [ ] Wire `MetricExpandedDetail timeRange 24h|7d|30d` to `CapacityChart` data filter — pass `range` prop + slice `rawData` by `timestamp cutoff` before mapping.
- [ ] Persist threshold toggle `overrides` via `PATCH /capacity/thresholds/:id {enabled}` with optimistic `setOverrides` + revert on error (parity with `monitoring` `RuleStatusToggle`).
- [ ] Unify `Avg CPU/Memory` computation — currently `utilizationPercent` avg; optionally use `avgLast24h` per metric if divergent (doc says Avg 24h).
- [ ] Wire `MetricCard` `MetricSparkline` time range same as `CapacityChart` — share `timeSeriesForMetric?limit=` param.
- [ ] Confirm `ScalingRecommendation status` union includes all 5 (`open|acknowledged|in_progress|implemented|dismissed`) vs legacy `src/types/capacity.ts:115` — align `capacity.ts:50` string check with union.
- [ ] Add filter URL persist `?horizon=30|90 & severity & status & search` via `useSearchParams` (heatmap-like `?service&date` pattern in `availability`).
- [ ] Implement `auto-create monitoring rule` checkbox — wire `autoRule true → POST /monitoring/rules` with derived query `metricId > threshold% for duration`.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/capacity.md` + `src/routes/capacity/*` + `server/routes/capacity.ts` + `src/types/capacity.ts` + `src/components/capacity/*` + `src/lib/constants.ts` to template features (Layout/Dashboard/Forecast/Thresholds + inline detail) | — |

