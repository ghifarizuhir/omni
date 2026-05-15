# Capacity

> **Route utama:** `/capacity` · **ITIL 4 Practice:** Capacity & Performance Management · **Sumber kode:** `src/routes/capacity/`, `server/routes/capacity.ts`

Modul Capacity memantau utilisasi resource per CI, forecast breach kapasitas, dan kelola threshold + alert.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/capacity` | `CapacityDashboard` | KPI utilisasi + critical metrics + recommendations |
| `/capacity/forecast` | `CapacityForecast` | Predictive analytics 30/90 day |
| `/capacity/thresholds` | `CapacityThresholds` | CRUD threshold/alert rule |

`CapacityLayout` accent: red critical, orange warning/imminent, green healthy.

---

## 2. Key Features

- **9 resource types**: CPU, Memory, Disk, Network Bandwidth, DB Connections, Queue Depth, Requests/sec, Storage IOPS, Concurrent Users.
- **3 prediction methods**: linear (90% acc), seasonal (75%), ARIMA (55%).
- **2 horizons**: 30-day, 90-day.
- **Threshold severity**: info, warning, critical dengan operator (&gt;/&gt;=/&lt;/&lt;=) + duration minutes.
- **Auto-scaling policy** flag + auto-create monitoring rule.
- **Imminent breach alerts** tier: Already Breached / Urgent (≤5d) / Warning (≤14d) / Info (&gt;14d).
- **Scaling recommendations**: scale_up/down/right_size/add_replica/remove_replica dengan priority.

---

## 3. CapacityDashboard

### 4 KPI cards
1. **Avg CPU (24h)** — average utilizationPercent, trend vs prev week.
2. **Avg Memory (24h)** — same pattern.
3. **Scaling Recs** — open recommendation count + urgent/high split.
4. **Forecast Alerts** — forecasts breach within 14 days.

### Critical Metrics Hero
Banner alert untuk metric `utilizationPercent ≥ criticalThreshold`.

### Main Metrics Grid (2-col)
**MetricCard** per metric:
- PublicId, name, resource type badge
- Current utilization % + bar (left border red/orange/green)
- 7d trend % change
- Peak 24h/7d
- Sparkline
- Warning/Critical threshold badges
- Click → expand `MetricExpandedDetail`
- Link CI: `/cmdb/{ciId}`

### Right rail
- **Active Recommendations** by priority (urgent/high/medium/low) → link `/capacity/forecast`.
- **Threshold Status**: active/total, triggering now, triggered 30d → link `/capacity/thresholds`.
- **Connected Sources** panel.
- **Change Linkage**: contoh CHG yang implement scaling decision.

---

## 4. CapacityForecast

### Horizon toggle
30d / 90d.

### Prediction Method (default Linear)
Linear, Seasonal, ARIMA dengan accuracy badge.

### Imminent Breach Alerts
Sort by `daysUntilBreach` asc. **PredictedBreachAlert** per forecast.

### Forecast Cards Grid (2-col)
- Metric name + horizon badge
- **ForecastChart** (line + confidence band)
- Predicted breach date + days until
- Confidence (UPPERCASE)
- Prediction method
- Recommendation text
- "Implement via change" → `/changes`

### Right rail
- **Top Drivers**: 3 metric paling dekat breach.
- **Forecast Accuracy** per method (last quarter).

---

## 5. CapacityThresholds

Filter: search (name/metric/publicId), severity (info/warning/critical), status (enabled/disabled), reset.

Stats chips: All count, by severity, by status.

Tabel: ID · Name/Metric · Severity pill · Condition (operator + value) · Duration · Auto-scale · Triggers (30d) · Status toggle.

"+ New threshold" gated `capacity.update` via `Can`.

### NewThresholdModal
Sections:
- **WHAT TO MONITOR**: name, description, metric select.
- **WHEN TO TRIGGER**: severity radio, condition builder (`value &gt; X% for Y minutes`).
- **WHAT TO DO**: alert route, auto-scaling checkbox + policy.
- **LINK TO MONITORING**: auto-create monitoring rule checkbox.

---

## 6. User / UX Flow

### Capacity planning
1. SRE buka dashboard, lihat KPI Avg CPU 78% (warning).
2. Critical Metrics Hero menunjukkan DB-PROD-01 di 92%.
3. Klik card → expanded detail.
4. Klik tab forecast → forecast 14 days breach.
5. Klik "Implement via change" → buat change scale_up.

### Threshold setup
1. Admin buka /capacity/thresholds → New threshold.
2. Pilih metric, severity=critical, value=90%, duration=5min.
3. Set alert route + enable auto-scaling.
4. Threshold muncul di tabel.

---

## 7. State Model

Recommendation: open → acknowledged → in_progress → implemented / dismissed.
Threshold: enabled ↔ disabled.

---

## 8. Roles & Permissions

| Permission | Required | Aksi |
|---|---|---|
| `capacity.read` | All authenticated | Lihat dashboard/forecast/thresholds |
| `capacity.update` | (TBD) | Create/edit threshold |

---

## 9. Upstream Dependencies

CMDB (CIs/services) · Monitoring (linked rules) · Changes (implementedViaChangeId).

---

## 10. Downstream Effects

- **Changes**: scaling decision → change request.
- **Monitoring**: auto-create monitoring rule kalau dicentang.
- **Alert routing**: alert channel = ROUTE-XXXX di alert routing.
- **Improvements**: kapasitas chronic gap → improvement initiative.

---

## 11. Data Model

`CapacityMetric`: id, publicId, name, resourceType, ciId/PublicId, serviceId, utilizationPercent, currentValue, capacityValue, warningThreshold, criticalThreshold, trend7d, changePercent7d, peakLast24h/7d/30d, avgLast24h, monitoringRulePublicIds[], timestamps.

`CapacityThreshold`: id, publicId, name, metricId, severity, operator, thresholdValue, durationMinutes, alertChannel, autoScalingEnabled, autoScalingPolicy, enabled, triggerCount30d, lastTriggeredAt, linkedRuleIds[], owner.

`CapacityForecast`: id, metricId/Name, predictionMethod, forecastHorizonDays, predictions[] (date, value, confidenceLower/Upper), predictedBreachDate, daysUntilBreach, confidence, recommendation, generatedAt.

`ScalingRecommendation`: id, publicId, metricId, ciPublicId, type, reason, suggestedAction, priority, daysUntilCriticalIfIgnored, status, implementedViaChangeId, forecastId, generatedAt, expiresAt.

`CapacityDataPoint`: timestamp, metricId, value, capacity (time-series).

---

## 12. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/capacity/metrics?critical=true` | `capacity.read` |
| GET | `/capacity/thresholds` | `capacity.read` |
| GET | `/capacity/forecasts?metricId=&imminent=true` | `capacity.read` |
| GET | `/capacity/time-series?metricId=` | `capacity.read` |
| GET | `/capacity/recommendations?open=true` | `capacity.read` |

> POST/PATCH/DELETE belum ada di server (NewThresholdModal masih client-side mock).

---

## 13. Realtime / Jobs

- **Forecast generator**: scheduled job hitung linear/seasonal/ARIMA per metric.
- **Threshold evaluator**: evaluate metric stream vs threshold dengan duration window, fire monitoring event.
- **Recommendation generator**: derived dari forecast + threshold history.

---

## 14. Open Gaps / TODO

- Threshold CRUD endpoint server belum ada (saat ini client mock).
- ARIMA accuracy realistically perlu lebih baik dari 55%.
- Auto-scaling policy belum di-execute (hanya disimpan).
- Time-series data resolution belum configurable.

---

**Lihat juga:** [CMDB](./cmdb.md) · [Monitoring](./monitoring.md) · [Changes](./changes.md) · [Improvements](./improvements.md)
