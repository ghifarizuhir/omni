import React from 'react';
import { RouteObject } from 'react-router-dom';
import { AppShell } from '@/src/components/layout/AppShell';
import { Login } from './Login';
import { Dashboard } from './Dashboard';
import { CMDBList } from './cmdb/CMDBList';
import { CMDBDetail } from './cmdb/CMDBDetail';
import { CMDBGraph } from './cmdb/CMDBGraph';
import { CMDBAudit } from './cmdb/CMDBAudit';
import { MonitoringOverview } from './monitoring/MonitoringOverview';
import { EventStream } from './monitoring/EventStream';
import { EventDetail } from './monitoring/EventDetail';
import { MonitoringRules } from './monitoring/MonitoringRules';
import { AlertRouting } from './monitoring/AlertRouting';
import { CoverageReport } from './monitoring/CoverageReport';
import { NotFound } from './NotFound';
import { IncidentQueue } from './incidents/IncidentQueue';
import { IncidentDetail } from './incidents/IncidentDetail';
import { MajorIncidentWarRoom } from './incidents/MajorIncidentWarRoom';
import { IncidentAnalytics } from './incidents/IncidentAnalytics';
import { ProblemList } from './problems/ProblemList';
import { ProblemDetail } from './problems/ProblemDetail';
import { RCAWorkspace } from './problems/RCAWorkspace';
import { KEDB } from './problems/KEDB';
import { PortalHome } from './portal/PortalHome';
import { Catalog } from './portal/Catalog';
import { CatalogItemDetail } from './portal/CatalogItemDetail';
import { MyRequests } from './portal/MyRequests';
import { RequestQueue } from './requests/RequestQueue';
import { RequestDetail } from './requests/RequestDetail';
import { KBBrowse } from './kb/KBBrowse';
import { ArticleView } from './kb/ArticleView';
import { KBEditor } from './kb/KBEditor';
import { KBAnalytics } from './kb/KBAnalytics';
import { ChangeCalendar } from './changes/ChangeCalendar';
import { NewChange } from './changes/NewChange';
import { ChangeDetail } from './changes/ChangeDetail';
import { CABWorkspace } from './changes/CABWorkspace';
import { ReleasesList } from './releases/ReleasesList';
import { ReleaseDetail } from './releases/ReleaseDetail';
import { ReleasePipeline } from './releases/ReleasePipeline';
import { ReleaseNotes } from './releases/ReleaseNotes';
import { DeploymentsQueue } from './deployments/DeploymentsQueue';
import { DeploymentDetail } from './deployments/DeploymentDetail';
import { Environments } from './deployments/Environments';
import { TestPlans } from './testing/TestPlans';
import { TestCases } from './testing/TestCases';
import { TestRuns } from './testing/TestRuns';
import { SignOffQueue } from './testing/SignOffQueue';
import { AvailabilityDashboard } from './availability/AvailabilityDashboard';
import { SLATargets } from './availability/SLATargets';
import { Outages } from './availability/Outages';
import CapacityDashboard from './capacity/CapacityDashboard';
import CapacityForecast from './capacity/CapacityForecast';
import CapacityThresholds from './capacity/CapacityThresholds';
import { ImprovementRegister } from './improvement/ImprovementRegister';
import { ImprovementDetail } from './improvement/ImprovementDetail';
import { ImprovementKanban } from './improvement/ImprovementKanban';
import { ImprovementHeatmap } from './improvement/ImprovementHeatmap';
import { BenefitTracker } from './improvement/BenefitTracker';
import { BIAMatrixPage } from './continuity/BIAMatrix';
import { DRPlans } from './continuity/DRPlans';
import { DRTests } from './continuity/DRTests';
import { DashboardsIndex } from './measurement/DashboardsIndex';
import { ExecutiveDashboard } from './measurement/ExecutiveDashboard';
import { Reports } from './measurement/Reports';
import { ReportBuilder } from './measurement/ReportBuilder';
import { MetricCatalog } from './measurement/MetricCatalog';
import { Inbox } from './platform/Inbox';
import NotificationPreferences from './platform/NotificationPreferences';
import Notifications from './platform/Notifications';
import { OnCall } from './platform/OnCall';
import { OnCallSchedule } from './platform/OnCallSchedule';
import { OnCallOverrides } from './platform/OnCallOverrides';
import StatusPage from './platform/StatusPage';
import { Profile } from './platform/Profile';
import { Settings } from './platform/Settings';
import { AiWorkspace } from './ai/AiWorkspace';

export const routes: RouteObject[] = [
  { path: '/login',         element: <Login /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true,                            element: <Dashboard /> },
      // Doc 1 — CMDB
      { path: 'cmdb',                           element: <CMDBList /> },
      { path: 'cmdb/graph',                     element: <CMDBGraph /> },
      { path: 'cmdb/audit',                     element: <CMDBAudit /> },
      { path: 'cmdb/:ciId',                     element: <CMDBDetail /> },
      // Doc 2 — Monitoring
      { path: 'monitoring',                     element: <MonitoringOverview /> },
      { path: 'events',                         element: <EventStream /> },
      { path: 'events/:id',                     element: <EventDetail /> },
      { path: 'monitoring/rules',               element: <MonitoringRules /> },
      { path: 'monitoring/routing',             element: <AlertRouting /> },
      { path: 'monitoring/coverage',            element: <CoverageReport /> },
      // Doc 3 — Operational Response
      { path: 'incidents',                         element: <IncidentQueue /> },
      { path: 'incidents/analytics',               element: <IncidentAnalytics /> },
      { path: 'incidents/major/:incidentId',          element: <MajorIncidentWarRoom /> },
      { path: 'incidents/:incidentId',              element: <IncidentDetail /> },
      { path: 'problems',                       element: <ProblemList /> },
      { path: 'problems/:problemId/rca',         element: <RCAWorkspace /> },
      { path: 'problems/:problemId',             element: <ProblemDetail /> },
      { path: 'kedb',                           element: <KEDB /> },
      { path: 'requests',                       element: <RequestQueue /> },
      { path: 'requests/:requestId',            element: <RequestDetail /> },
      { path: 'portal',                         element: <PortalHome /> },
      { path: 'portal/catalog',                 element: <Catalog /> },
      { path: 'portal/catalog/:itemId',         element: <CatalogItemDetail /> },
      { path: 'portal/my-requests',             element: <MyRequests /> },
      { path: 'kb',                             element: <KBBrowse /> },
      { path: 'kb/analytics',                   element: <KBAnalytics /> },
      { path: 'kb/editor',                      element: <KBEditor /> },
      { path: 'kb/editor/:slug',                element: <KBEditor /> },
      { path: 'kb/:slug',                       element: <ArticleView /> },
      // Doc 4 — Change & Delivery
      { path: 'changes',                        element: <ChangeCalendar /> },
      { path: 'changes/new',                    element: <NewChange /> },
      { path: 'changes/calendar',               element: <ChangeCalendar /> },
      { path: 'changes/cab',                    element: <CABWorkspace /> },
      { path: 'changes/:changeId',              element: <ChangeDetail /> },
      { path: 'releases',                       element: <ReleasesList /> },
      { path: 'releases/pipeline',              element: <ReleasePipeline /> },
      { path: 'releases/notes',                 element: <ReleaseNotes /> },
      { path: 'releases/:releaseId',            element: <ReleaseDetail /> },
      { path: 'deployments',                    element: <DeploymentsQueue /> },
      { path: 'deployments/:deploymentId',      element: <DeploymentDetail /> },
      { path: 'environments',                   element: <Environments /> },
      { path: 'testing/plans',                  element: <TestPlans /> },
      { path: 'testing/cases',                  element: <TestCases /> },
      { path: 'testing/runs',                   element: <TestRuns /> },
      { path: 'testing/sign-off',               element: <SignOffQueue /> },
      // Doc 5 — Service Health & Intelligence
      { path: 'availability',                   element: <AvailabilityDashboard /> },
      { path: 'availability/sla',               element: <SLATargets /> },
      { path: 'availability/outages',           element: <Outages /> },
      { path: 'capacity',                       element: <CapacityDashboard /> },
      { path: 'capacity/forecast',              element: <CapacityForecast /> },
      { path: 'capacity/thresholds',            element: <CapacityThresholds /> },
      { path: 'continuity/bia',                 element: <BIAMatrixPage /> },
      { path: 'continuity/dr-plans',            element: <DRPlans /> },
      { path: 'continuity/tests',               element: <DRTests /> },
      { path: 'dashboards/exec',                 element: <ExecutiveDashboard /> },
      { path: 'dashboards',                      element: <DashboardsIndex /> },
      { path: 'reports/builder',                 element: <ReportBuilder /> },
      { path: 'reports',                         element: <Reports /> },
      { path: 'metrics/catalog',                 element: <MetricCatalog /> },
      { path: 'improvement',                    element: <ImprovementRegister /> },
      { path: 'improvement/kanban',             element: <ImprovementKanban /> },
      { path: 'improvement/heatmap',            element: <ImprovementHeatmap /> },
      { path: 'improvement/benefits',           element: <BenefitTracker /> },
      { path: 'improvement/:initiativeId',      element: <ImprovementDetail /> },
      // Doc 6 — Platform Features
      { path: 'inbox',                          element: <Inbox /> },
      { path: 'notifications/preferences',      element: <NotificationPreferences /> },
      { path: 'notifications',                  element: <Notifications /> },
      { path: 'on-call',                        element: <OnCall /> },
      { path: 'on-call/schedule',               element: <OnCallSchedule /> },
      { path: 'on-call/overrides',              element: <OnCallOverrides /> },
      { path: 'status',                         element: <StatusPage /> },
      { path: 'profile',                        element: <Profile /> },
      // Settings
      { path: 'settings',                       element: <Settings /> },
      // 404
      { path: '*',                              element: <NotFound /> },
      // AI Workspace
      { path: 'ai',            element: <AiWorkspace /> },
      { path: 'ai/:sessionId', element: <AiWorkspace /> },
    ]
  },
];
