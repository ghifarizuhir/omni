# OIS - ITIL 4 Management Practices Mapping

> **Konteks:** Operational Intelligence System (OIS) sebagai platform yang menggabungkan ITSM workflow dengan kemampuan observability dan data intelligence — mengorkestrasi 15 management practices ITIL 4 + 4 platform features untuk operasi layanan IT.

---

## Daftar Isi

1. [Availability Management](#1-availability-management)
2. [Capacity and Performance Management](#2-capacity-and-performance-management)
3. [Change Enablement](#3-change-enablement)
4. [Incident Management](#4-incident-management)
5. [Problem Management](#5-problem-management)
6. [Release Management](#6-release-management)
7. [Service Request Management](#7-service-request-management)
8. [Service Configuration Management](#8-service-configuration-management)
9. [Deployment Management](#9-deployment-management)
10. [Service Continuity Management](#10-service-continuity-management)
11. [Service Validation and Testing](#11-service-validation-and-testing)
12. [Knowledge Management](#12-knowledge-management)
13. [Measurement and Reporting](#13-measurement-and-reporting)
14. [Monitoring and Event Management](#14-monitoring-and-event-management) ⭐ *new*
15. [Continual Improvement](#15-continual-improvement) ⭐ *new*
16. [Inbox — Action-Required Center](#16-inbox--action-required-center) ⭐ *new*
17. [Notification Center](#17-notification-center) ⭐ *new*
18. [Notification Preference Center](#18-notification-preference-center) ⭐ *new*
19. [On-Call Management](#19-on-call-management) ⭐ *new*
20. [Internal Status Page](#20-internal-status-page) ⭐ *new*
21. [Peta Korelasi Tingkat Tinggi](#-peta-korelasi-tingkat-tinggi)
22. [Cluster Implementasi yang Disarankan](#-cluster-implementasi-yang-disarankan)

---

## 1. Availability Management

**Purpose:** Memastikan layanan memenuhi tingkat ketersediaan yang disepakati (sesuai SLA/SLO) dengan biaya dan risiko yang dapat diterima.

**Page/Menu Utama:**
- `Availability Dashboard` — uptime real-time per service, MTBF, MTTR, MTRS
- `SLA/SLO Definition` — target ketersediaan per service tier
- `Availability Plan` — proyeksi & forecast ketersediaan jangka panjang
- `Outage Log & Analysis` — riwayat downtime + root cause linkage

**Korelasi:**
- → **Incident Management:** outage memicu insiden; data MTTR diambil dari incident records
- → **Problem Management:** pola unavailability menjadi input investigasi root cause
- → **Capacity Management:** ketersediaan ↔ kapasitas adalah dua sisi mata uang yang sama
- → **Continuity Management:** availability harian vs disaster recovery jangka panjang
- → **Measurement & Reporting:** men-supply metrik availability

---

## 2. Capacity and Performance Management

**Purpose:** Memastikan layanan mencapai performa yang disepakati dan memenuhi demand saat ini & di masa depan secara cost-effective.

**Page/Menu Utama:**
- `Capacity Dashboard` — utilization CPU/memory/storage/network/DB connections
- `Performance Metrics` — response time, throughput, latency per service
- `Capacity Plan` — forecast demand, scaling roadmap
- `Threshold & Alert Config` — trigger untuk auto-scaling atau notifikasi

**Korelasi:**
- → **Availability Management:** kapasitas tidak cukup → degradasi → unavailability
- → **Change Enablement:** rekomendasi scaling memunculkan change request
- → **Incident Management:** breach threshold dapat di-auto-create sebagai incident
- → **Service Configuration Management:** capacity diukur per CI
- → **Measurement & Reporting:** trending data untuk forecast

---

## 3. Change Enablement

**Purpose:** Memaksimalkan jumlah perubahan IT yang berhasil dengan memastikan risiko dinilai dengan benar, perubahan diotorisasi, dan jadwal dikelola.

**Page/Menu Utama:**
- `Change Request (RFC)` — form pengajuan perubahan dengan klasifikasi (standard/normal/emergency)
- `Change Calendar/Schedule` — jadwal forward (FSC) untuk visibilitas konflik
- `CAB Workspace` — review board, approval workflow, risk scoring
- `Change Records` — riwayat & post-implementation review (PIR)

**Korelasi:**
- → **Release Management:** change yang disetujui menjadi input release plan
- → **Deployment Management:** eksekusi teknis dari change
- → **Service Configuration Management:** setiap change mengupdate CI di CMDB
- → **Problem Management:** known error fix sering dieksekusi via change
- → **Service Validation & Testing:** change harus diuji sebelum approval final
- → **Risk Management** *(general practice di luar scope ini):* risk assessment

---

## 4. Incident Management

**Purpose:** Meminimalkan dampak negatif dari insiden dengan memulihkan operasi layanan normal secepat mungkin.

**Page/Menu Utama:**
- `Incident Queue/Ticket Board` — list, filter by priority/status/assignee
- `Incident Detail` — timeline, communication log, linked CIs, related problem
- `Major Incident Console` — war room view untuk P1
- `Incident Analytics` — MTTR, volume trending, top categories

**Korelasi:**
- → **Problem Management:** insiden berulang/major → trigger problem investigation
- → **Knowledge Management:** akses workaround & known errors saat resolusi
- → **Service Request Management:** sering bersisian di service desk (jangan dicampur)
- → **Service Configuration Management:** identifikasi CI yang terdampak
- → **Availability Management:** durasi insiden mempengaruhi metrik availability
- → **Monitoring and Event Management:** event dapat auto-create incident

---

## 5. Problem Management

**Purpose:** Mengurangi kemungkinan dan dampak insiden dengan mengidentifikasi penyebab aktual & potensial dan mengelola workaround serta known errors.

**Page/Menu Utama:**
- `Problem Register` — list problem aktif/known errors
- `Root Cause Analysis (RCA) Workspace` — investigasi (5 Whys, fishbone, dst.)
- `Known Error Database (KEDB)` — solusi & workaround terdokumentasi
- `Problem-to-Change Linkage` — tracking permanent fix

**Korelasi:**
- → **Incident Management:** banyak insiden serupa → satu problem; KEDB feed ke incident
- → **Change Enablement:** permanent fix membutuhkan change
- → **Knowledge Management:** RCA & KEDB menjadi aset pengetahuan
- → **Service Configuration Management:** pemahaman dependency CI penting untuk RCA
- → **Service Validation & Testing:** verifikasi fix sebelum closure

---

## 6. Release Management

**Purpose:** Membuat layanan & fitur baru/yang diubah tersedia untuk digunakan.

**Page/Menu Utama:**
- `Release Plan/Roadmap` — versioning, scope, target tanggal
- `Release Pipeline` — status per environment (dev → staging → prod)
- `Release Notes Manager` — komunikasi ke stakeholder/user
- `Release History & Rollback` — record + jejak rollback plan

**Korelasi:**
- → **Change Enablement:** release adalah eksekusi dari sekumpulan change
- → **Deployment Management:** release ≠ deploy; release bisa "dark" lalu di-toggle on
- → **Service Validation & Testing:** gate sebelum release
- → **Service Configuration Management:** baseline & versi CI ter-update
- → **Knowledge Management:** release notes & dokumentasi user

> **Catatan ITIL 4:** Pisahkan dengan tegas konsep **release** (membuat tersedia bagi user) dari **deploy** (memindahkan komponen ke environment). Ini perubahan penting dari ITIL v3.

---

## 7. Service Request Management

**Purpose:** Mendukung kualitas layanan yang disepakati dengan menangani semua service request dari user secara efektif & ramah.

**Page/Menu Utama:**
- `Service Catalog/Portal` — request types yang dapat di-self-service
- `Request Queue` — antrian fulfilment per kategori
- `Request Workflow Designer` — template workflow untuk request berulang
- `Approval Inbox` — untuk request yang perlu otorisasi (akses, lisensi, dll.)

**Korelasi:**
- → **Incident Management:** terpisah secara konsep — request bersifat normal/pre-defined; insiden bersifat unplanned
- → **Knowledge Management:** artikel how-to & FAQ untuk self-service deflection
- → **Service Configuration Management:** request akses/perangkat memodifikasi CI
- → **Change Enablement:** request berulang & low-risk dapat dikelola sebagai standard change

---

## 8. Service Configuration Management

**Purpose:** Memastikan informasi yang akurat & andal tersedia tentang konfigurasi layanan dan CI yang mendukungnya, kapan & di mana dibutuhkan.

**Page/Menu Utama:**
- `CMDB Browser` — search/filter CI berdasarkan tipe, owner, status
- `CI Detail & Relationship Map` — visualisasi dependency (graph view)
- `Service Map` — bagaimana CI menyusun service end-to-end
- `Configuration Audit & Reconciliation` — discovery vs declared state

**Korelasi:**
- → **Hampir semua practice lain** — CMDB adalah backbone:
  - Incident: identifikasi CI terdampak
  - Problem: dependency analysis
  - Change/Release/Deploy: impact assessment & target deployment
  - Availability/Capacity: per-CI measurement
- → **Knowledge Management:** dokumentasi CI sebagai aset pengetahuan

---

## 9. Deployment Management

**Purpose:** Memindahkan hardware, software, dokumentasi, proses, atau komponen baru/yang diubah ke environment live (atau test).

**Page/Menu Utama:**
- `Deployment Pipeline` — status build & deploy per env (CI/CD integration)
- `Deployment Strategy Config` — big bang, phased, blue-green, canary, rolling
- `Environment Manager` — daftar environment, health, current version
- `Deployment Log` — artifact tracking, hash, who/when/what

**Korelasi:**
- → **Release Management:** deploy bisa terjadi tanpa release ke user (feature flag off)
- → **Change Enablement:** setiap deploy ke prod terikat ke change record
- → **Service Configuration Management:** deploy mengubah state CI
- → **Service Validation & Testing:** gate quality sebelum deploy
- → **Continuity Management:** deployment plan harus include rollback/DR consideration

---

## 10. Service Continuity Management

**Purpose:** Memastikan ketersediaan & performa layanan dipertahankan pada level yang cukup jika terjadi disaster atau gangguan besar.

**Page/Menu Utama:**
- `BIA Workspace` — Business Impact Analysis per service (RTO/RPO)
- `DR Plan Repository` — runbook continuity per service
- `DR Test Schedule & Results` — exercise log
- `Crisis Communication Console` — stakeholder notification template

**Korelasi:**
- → **Availability Management:** complement — availability = day-to-day; continuity = catastrophic event
- → **Risk Management** *(general):* threats sebagai input plan
- → **Service Configuration Management:** dependency mapping kritis untuk DR
- → **Incident Management:** major incident bisa eskalasi menjadi invocation continuity plan
- → **Service Validation & Testing:** DR test adalah bentuk testing

---

## 11. Service Validation and Testing

**Purpose:** Memastikan produk & layanan baru/yang diubah memenuhi requirement yang didefinisikan, dari sisi utility (fit for purpose) & warranty (fit for use).

**Page/Menu Utama:**
- `Test Plan & Strategy` — definisi level test (unit/integration/UAT/perf/security)
- `Test Case Library` — repositori reusable
- `Test Execution Dashboard` — pass/fail rate, coverage
- `Acceptance Criteria & Sign-off` — gate ke release/deploy

**Korelasi:**
- → **Change Enablement:** test result = input keputusan CAB
- → **Release Management:** entry/exit criteria release
- → **Deployment Management:** smoke test post-deploy
- → **Problem Management:** verifikasi permanent fix
- → **Continuity Management:** DR drill termasuk testing

---

## 12. Knowledge Management

**Purpose:** Mempertahankan & meningkatkan penggunaan informasi yang efektif, efisien, & mudah di seluruh organisasi.

**Page/Menu Utama:**
- `Knowledge Base (KB)` — artikel terkategorisasi (how-to, FAQ, troubleshooting)
- `KB Article Editor` — workflow create/review/publish/expire
- `Search & Recommendation` — discovery (sebaiknya AI-assisted untuk OIS)
- `Article Analytics` — usage, helpfulness rating, gap analysis

**Korelasi:**
- → **Incident Management:** akses workaround mempercepat resolusi
- → **Problem Management:** KEDB adalah subset knowledge
- → **Service Request Management:** self-service deflection via KB
- → **Release Management:** release notes & user guide
- → **Semua practice:** lessons learned di-capture sebagai knowledge artifact

---

## 13. Measurement and Reporting

**Purpose:** Mendukung pengambilan keputusan yang baik & continual improvement dengan mengurangi tingkat ketidakpastian, melalui pengumpulan data yang relevan & evaluasi terhadap target yang ditetapkan.

**Page/Menu Utama:**
- `Executive Dashboard` — KPI/CSF agregat lintas practice
- `Practice-specific Reports` — drill-down per management area
- `Custom Report Builder` — query, filter, schedule, export
- `Metric Definition Catalog` — taksonomi metrik & owner

**Korelasi:**
- → **Semua 12 practice di atas** — adalah konsumen sekaligus supplier data:
  - Konsumsi raw data dari setiap practice
  - Supply insight balik untuk continual improvement
- Dianggap sebagai **lapisan cross-cutting** di OIS, bukan modul terisolasi.

---

## 14. Monitoring and Event Management

**Purpose:** Mengamati layanan & komponennya secara sistematis, dan mendeteksi perubahan kondisi (event) yang signifikan untuk operasi normal — kemudian menentukan respons yang tepat (informational, warning, exception).

**Page/Menu Utama:**
- `Event Console` — live stream event dari semua source (logs, metrics, traces, agent), filter & grouping
- `Threshold & Rule Manager` — definisi rule (static threshold, anomaly detection, composite condition)
- `Alert Routing & On-Call` — siapa di-page untuk apa, eskalasi, quiet hours, schedule rotation
- `Event Correlation View` — visualisasi cluster event terkait (mis. 50 alert → 1 root event)
- `Monitoring Coverage Report` — gap analysis: CI mana yang belum ter-cover monitoring

**Karakter Event (ITIL 4):**
- **Informational** — perubahan state normal yang dicatat (mis. job completed sukses)
- **Warning** — mendekati threshold (mis. CPU 80%)
- **Exception** — sudah breach atau abnormal (mis. service down)

**Korelasi:**
- → **Incident Management:** event tipe *exception* dapat auto-create incident; *warning* membuat preventive ticket
- → **Availability Management:** uptime tick adalah event; downtime detection berasal dari sini
- → **Capacity Management:** metric stream menjadi input forecasting & threshold breach
- → **Service Configuration Management:** event ter-link ke CI; coverage diukur per CI
- → **Problem Management:** pattern event berulang menjadi sinyal problem
- → **Continual Improvement:** noise/false-positive rate menjadi target improvement
- → **Measurement & Reporting:** raw data observability untuk semua dashboard

> **Catatan:** Monitoring & Event Management adalah **feeder utama** karakter "intelligence" OIS. Correlation engine OIS hidup di antara practice ini dan Incident/Problem.

---

## 15. Continual Improvement

**Purpose:** Menyelaraskan praktik & layanan organisasi dengan kebutuhan bisnis yang berubah, melalui identifikasi & perbaikan berkelanjutan terhadap layanan, komponen, dan praktik.

**Page/Menu Utama:**
- `Continual Improvement Register (CIR)` — backlog ide improvement dengan status, owner, prioritas
- `Improvement Kanban` — workflow board (Idea → Assessed → Approved → In Progress → Verified → Closed)
- `PIR & Lesson Learned Linker` — capture insight dari post-implementation review, post-incident review, retrospective
- `Benefit Tracking` — baseline vs target metric per improvement, realized benefit
- `Improvement Heatmap` — visualisasi area mana yang paling banyak inisiatif (by practice/service/team)

**ITIL 4 Continual Improvement Model (7 langkah):**
1. What is the vision? — selaras dengan tujuan organisasi
2. Where are we now? — assessment baseline
3. Where do we want to be? — target measurable
4. How do we get there? — plan & approach
5. Take action — eksekusi (biasanya via Change Enablement)
6. Did we get there? — verifikasi outcome
7. How do we keep the momentum going? — embed di operasi normal

**Korelasi:**
- ← **Semua practice** — input ide improvement bisa datang dari mana saja:
  - Problem Management → permanent fix sebagai improvement
  - Incident PIR → action item sebagai improvement
  - Measurement & Reporting → trend buruk → improvement initiative
  - Knowledge Management → gap KB → improvement
  - Monitoring & Event → noise reduction, coverage gap → improvement
- → **Change Enablement:** mayoritas improvement yang sudah approved dieksekusi via change record
- → **Knowledge Management:** lesson learned & best practice di-capture
- → **Measurement & Reporting:** menyuplai baseline & target metric

> **Catatan posisi:** Sama seperti Measurement & Reporting, Continual Improvement adalah **lapisan cross-cutting**. Bedanya, Measurement memberi *visibility*, Continual Improvement memberi *momentum perbaikan*. Keduanya saling melengkapi.

---

## 16. Inbox — Action-Required Center

**Bukan ITIL practice** — ini adalah **platform feature** UX yang mengagregasi semua item yang memerlukan tindakan eksplisit dari user, lintas seluruh modul.

**Purpose:** Memberikan satu tempat terpusat di mana operator/agent/manager dapat melihat dan mengeksekusi semua hal yang menunggu keputusan mereka — tanpa harus membuka setiap modul satu per satu.

**Page/Menu Utama:**
- `Inbox` — daftar action-required items (approval, eskalasi, sign-off, acknowledgment), filter by module/priority/due date
- `Inbox Item Detail` — preview context item + tombol action langsung (Approve / Reject / Escalate / Acknowledge)
- Badge counter real-time di navigasi global

**Tipe item yang masuk Inbox:**
| Tipe | Source event | Actor |
|------|-------------|-------|
| CAB approval | `change.approval.requested` | Change Manager, CAB member |
| Eskalasi incident | `incident.escalation.required` | Agent L2/L3 |
| Sign-off release | `release.sign-off.required` | Release Manager |
| Acknowledgment major incident | `incident.major.declared` | On-call, incident commander |
| Approval service request | `request.approval.requested` | Service Owner, manager |
| Sign-off test plan | `validation.sign-off.required` | QA, Service Owner |

**Korelasi:**
- ← **Change Enablement:** approval CAB adalah item paling kritis di Inbox
- ← **Incident Management:** eskalasi dan major incident acknowledgment
- ← **Service Request:** approval workflow
- ← **Release & Validation:** sign-off sebelum promote/deploy
- → **Notification Engine:** Inbox tidak push sendiri — engine yang menulis item ke Inbox berdasarkan event
- → **Semua modul sumber:** aksi dari Inbox di-delegate ke API modul terkait (Inbox tidak punya logika bisnis sendiri)

> **Desain prinsip:** Inbox adalah *aggregation surface*, bukan *workflow engine*. Setiap action tetap diproses oleh modul yang bersangkutan.

---

## 17. Notification Center

**Bukan ITIL practice** — platform feature untuk notifikasi **pasif** (tidak memerlukan tindakan langsung).

**Purpose:** Menyimpan dan menampilkan feed informasi terkini yang relevan bagi user — update status, mention, digest — sehingga user tetap aware tanpa harus subscribe ke banyak channel.

**Page/Menu Utama:**
- `Notification Feed` — diakses via bell icon navbar, list reverse-chronological
- `Full Notification Page` — `/notifications` untuk view & filter lengkap (opsional)
- Mark-as-read, bulk clear

**Tipe notifikasi:**
| Tipe | Contoh |
|------|--------|
| `info` | Incident baru di-assign ke user |
| `update` | Status incident yang diikuti berubah ke "resolved" |
| `mention` | User di-@mention di komentar problem |
| `digest` | Ringkasan mingguan KB articles baru |
| `system` | Maintenance window sistem OIS |

**Korelasi:**
- ← **Semua modul** sebagai producer event
- → **Notification Engine:** engine yang memutuskan mana yang masuk Notification Center vs Inbox
- → **Notification Preference Center:** engine cek preference sebelum menulis notifikasi

---

## 18. Notification Preference Center

**Bukan ITIL practice** — platform feature untuk kontrol user atas notifikasi yang mereka terima.

**Purpose:** Mencegah notification fatigue dengan memberi user kontrol mute/unmute per modul, tanpa harus minta admin.

**Page/Menu Utama:**
- `/settings/notifications` — halaman settings dengan toggle per modul × per channel (in-app, email, Slack)

**Granularitas v1:** mute/unmute per module. Per-severity dan per-event-type untuk fase lanjut.

**Modul yang bisa dikontrol:**
`incident` · `change` · `problem` · `service_request` · `monitoring` · `knowledge` · `improvement` · `oncall` · `statuspage`

**Korelasi:**
- → **Notification Engine:** dikonsultasi engine sebelum setiap routing (cache Redis max 5 menit)
- ← **Admin:** dapat set default preference org-wide; user bisa override sebagian

---

## 19. On-Call Management

**Bukan ITIL practice secara eksplisit** — tapi merupakan enabler kritis untuk Incident Management dan Monitoring & Event Management. ITIL 4 menyinggungnya dalam konteks *Service Desk* dan *Incident Management* tanpa mendefinisikan sebagai practice tersendiri.

**Purpose:** Memastikan selalu ada orang yang bertanggung jawab merespons alert dan insiden di setiap waktu — dengan rotasi yang adil, handover yang terstruktur, dan eskalasi otomatis bila tidak ada respons.

**Page/Menu Utama:**
- `On-Call Schedules` — daftar schedule per service/tim, konfigurasi rotasi
- `Schedule Calendar` — tampilan kalender siapa on-call kapan (per schedule/layer)
- `My Shifts` — jadwal on-call personal user yang login
- `Override Manager` — ganti shift (sakit, liburan) secara manual
- `Handover Console` — form handover terstruktur: open incidents, catatan, hal yang perlu dipantau
- `Escalation Policies` — definisi step eskalasi: delay, target (user/tim/schedule), channel

**Fitur utama:**
| Fitur | Deskripsi |
|-------|-----------|
| Rotasi otomatis | Weekly/daily/custom rotation dari daftar participants |
| Multi-layer | Primary + Secondary on-call dalam satu schedule |
| Override | Manual ganti shift tanpa mengubah rotation pattern |
| Handover | Serah terima terstruktur dengan snapshot open incidents |
| Acknowledgment | On-call wajib ack alert; bila tidak → eskalasi otomatis |
| "Who's on-call now?" | API query cepat (< 50ms via Redis cache) |

**Korelasi:**
- → **Incident Management:** saat incident dibuat, routing ke on-call yang tepat via `AlertRoute → EscalationPolicy`
- → **Monitoring & Event Management:** alert dari monitoring di-route ke on-call schedule
- → **Inbox:** eskalasi yang belum diack menjadi action-required item di Inbox on-call
- → **Notification Engine:** on-call alert via push notification, email, SMS (opsional)
- ← **Change Enablement:** maintenance window dapat mempengaruhi siapa yang on-call (auto-suppress alert saat maintenance)

> **Catatan:** Native penuh di v1 — tidak bergantung PagerDuty/Opsgenie. Integrasi ke tool eksternal tersebut dapat ditambahkan di fase lanjut sebagai opsi sync.

---

## 20. Internal Status Page

**Bukan ITIL practice** — platform feature yang mendukung **Service Desk** dan **Incident Management** dengan memberikan visibilitas health layanan kepada seluruh karyawan/tim IT.

**Purpose:** Mengurangi volume tiket "apakah sistem X sedang down?" dengan menyediakan satu sumber kebenaran untuk status layanan — yang auto-update dari incident dan bisa diupdate manual oleh service owner.

**Page/Menu Utama:**
- `/status` — main page, read-only, no-auth untuk internal network; daftar semua service + status saat ini + ongoing incidents
- `Service Status Detail` — uptime history 90 hari per service (data dari Availability Management)
- `Incident Updates` — timeline update ongoing incident/maintenance
- `/status/admin` — kelola services, declare maintenance, post manual update

**Status values per service:**
| Status | Kondisi |
|--------|---------|
| `operational` | Normal, tidak ada issue |
| `degraded` | Performa menurun tapi masih berfungsi |
| `partial_outage` | Sebagian komponen tidak berfungsi |
| `major_outage` | Service tidak bisa digunakan |
| `maintenance` | Maintenance window terjadwal |

**Korelasi:**
- ← **Incident Management:** incident P1/P2 → auto-update status ke `major_outage`/`partial_outage`; incident resolved → revert ke `operational`
- ← **Change Enablement / Deployment:** maintenance window → auto-set `maintenance`
- ← **Availability Management:** data uptime history 90 hari diambil dari TimescaleDB
- → **Notification Engine:** perubahan status page dapat memicu notifikasi ke subscriber (opsional, fase lanjut)
- → **Self-Service Portal (7.4):** end-user yang submit tiket dapat diinformasikan "layanan X sedang maintenance" saat checkout katalog

> **Desain prinsip:** Status Page **tidak memiliki incident tracker sendiri** — `StatusPageIncident` hanya wrapper komunikasi di atas `Incident` ITSM yang sudah ada. Data selalu sinkron dari sumber kebenaran modul Incident.

> **Akses:** Internal only (v1). Halaman read di-serve tanpa auth tapi dibatasi IP range internal via proxy/infra config. Admin routes tetap butuh auth role `service-owner` atau `admin`.

```
         ┌──── Continual Improvement ──────┐    ◄── cross-cutting (momentum)
         │                                  │
         ├──── Measurement & Reporting ────┤    ◄── cross-cutting (visibility)
         │                                  │
         ▼                                  ▼
   [Demand]                                              [Value]
      │                                                    ▲
      ▼                                                    │
  Service Request ──► Knowledge ◄──── Problem ◄──── Incident
                                          │             ▲ │
                                          ▼             │ │
                                    Change Enablement   │ │
                                          │             │ │
                            ┌─────────────┼──────────┐  │ │
                            ▼             ▼          ▼  │ │
                         Release    Deployment   Validation
                            │             │      & Testing
                            └─────┬───────┘
                                  ▼
                    Service Configuration (CMDB ─ backbone)
                                  │
                  ┌───────────────┼─────────────────┐
                  ▼               ▼                 ▼
            Availability     Capacity          Continuity
                  ▲               ▲                 ▲
                  │               │                 │
                  └───────┬───────┴─────────┬───────┘
                          │                 │
                  Monitoring & Event Management   ◄── feeder (signals)
                          │
                  [logs · metrics · traces · agents]

── Platform Features (cross-cutting, Phase 2) ──────────────────

  On-Call Mgmt ◄──► Incident + Monitoring   (routing alert ke on-call)
  Status Page  ◄──── Incident + Availability (auto-update dari incident)
  Inbox        ◄──── Change + Incident + Release + Request (action-required)
  Notif Center ◄──── Semua modul (informational events)
               └──►  Notification Engine ──► Email / Slack / SMS
                          ▲
                  Notification Preference Center (user control)
```


---

## 🧩 Cluster Implementasi yang Disarankan

Untuk fase build, kelompokkan practices berdasarkan kedekatan domain:

1. **Foundation Cluster** — Service Configuration (CMDB) — *prerequisite untuk yang lain, dibangun pertama*
2. **Observability Cluster** — Monitoring & Event Management — *feeder utama, sebaiknya bersamaan dengan Foundation*
3. **Operational Response Cluster** — Incident, Problem, Service Request, Knowledge
4. **Change & Delivery Cluster** — Change Enablement, Release, Deployment, Validation & Testing
5. **Service Health Cluster** — Availability, Capacity, Continuity
6. **Intelligence Layer** — Measurement & Reporting + Continual Improvement — *cross-cutting, dibangun bersamaan dengan cluster lain*
7. **Platform Features** — Inbox, Notification Center, Notification Preference Center, On-Call Management, Internal Status Page — *Phase 2, setelah Incident & Change siap*

---

## 📌 Catatan Implementasi untuk OIS

Beberapa hal yang perlu dipertimbangkan untuk OIS sebagai *Operational Intelligence System*:

- **CMDB harus dibangun lebih dulu** — hampir semua practice bergantung padanya
- **Monitoring & Event Management adalah pasangan natural CMDB** — tanpa observability data, sebagian besar practice lain bekerja secara reaktif/manual saja
- **Measurement & Reporting bukan modul terpisah** — instrumentasi ditanam di setiap practice sejak awal
- **Continual Improvement Register** sebaiknya hidup sejak Phase awal (meski sederhana) — supaya lesson learned tidak hilang sebelum modul UI-nya jadi
- Karakter "intelligence" OIS akan paling kuat jika ada **correlation engine** antara event → incident → problem → change (ini fitur diferensiasi vs ITSM tool generik)
- Pertimbangkan **integrasi observability** (logs, metrics, traces) sebagai sumber otomatis untuk Monitoring & Event, Availability, Capacity, dan Incident
- **Platform Features (Inbox, On-Call, Status Page)** adalah fitur yang paling dirasakan end-user sehari-hari — kualitas UX ketiga fitur ini menentukan adopsi tim operasional
- **Notification Engine adalah infrastruktur bersama** — bangun dengan decision tree routing yang dapat dikonfigurasi sebelum Inbox dan Notification Center diimplementasi

---

*Dokumen referensi berdasarkan ITIL 4 Foundation & Management Practices (Axelos/PeopleCert).*
