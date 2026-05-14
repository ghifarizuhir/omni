import React from 'react';
import { RouteObject } from 'react-router-dom';
import { AppShell } from '@/src/components/layout/AppShell';
import { Login } from './Login';
import { Dashboard } from './Dashboard';
import { CMDBList } from './cmdb/CMDBList';
import { CMDBDetail } from './cmdb/CMDBDetail';
import { CMDBGraph } from './cmdb/CMDBGraph';
import { CMDBAudit } from './cmdb/CMDBAudit';
import { MonitoringLayout } from './monitoring/MonitoringLayout';
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
import { PortalLayout } from './portal/PortalLayout';
import { PortalHome } from './portal/PortalHome';
import { Catalog } from './portal/Catalog';
import { CatalogItemDetail } from './portal/CatalogItemDetail';
import { MyRequests } from './portal/MyRequests';
import { RequestQueue } from './requests/RequestQueue';
import { RequestDetail } from './requests/RequestDetail';
import { KBLayout } from './kb/KBLayout';
import { KBBrowse } from './kb/KBBrowse';
import { ArticleView } from './kb/ArticleView';
import { KBEditor } from './kb/KBEditor';
import { KBAnalytics } from './kb/KBAnalytics';
import { ChangeCalendar } from './changes/ChangeCalendar';
import { NewChange } from './changes/NewChange';
import { ChangeDetail } from './changes/ChangeDetail';
import { CABWorkspace } from './changes/CABWorkspace';
import { ReleasesLayout } from './releases/ReleasesLayout';
import { ReleasesList } from './releases/ReleasesList';
import { ReleaseDetail } from './releases/ReleaseDetail';
import { ReleasePipeline } from './releases/ReleasePipeline';
import { ReleaseNotes } from './releases/ReleaseNotes';
import { DeploymentsLayout } from './deployments/DeploymentsLayout';
import { DeploymentsQueue } from './deployments/DeploymentsQueue';
import { DeploymentDetail } from './deployments/DeploymentDetail';
import { Environments } from './deployments/Environments';
import { TestingLayout } from './testing/TestingLayout';
import { TestPlans } from './testing/TestPlans';
import { TestCases } from './testing/TestCases';
import { TestRuns } from './testing/TestRuns';
import { SignOffQueue } from './testing/SignOffQueue';
import { AvailabilityLayout } from './availability/AvailabilityLayout';
import { AvailabilityDashboard } from './availability/AvailabilityDashboard';
import { SLATargets } from './availability/SLATargets';
import { Outages } from './availability/Outages';
import { CapacityLayout } from './capacity/CapacityLayout';
import CapacityDashboard from './capacity/CapacityDashboard';
import CapacityForecast from './capacity/CapacityForecast';
import CapacityThresholds from './capacity/CapacityThresholds';
import { ContinuityLayout } from './continuity/ContinuityLayout';
import { ImprovementRegister } from './improvement/ImprovementRegister';
import { ImprovementDetail } from './improvement/ImprovementDetail';
import { ImprovementKanban } from './improvement/ImprovementKanban';
import { ImprovementHeatmap } from './improvement/ImprovementHeatmap';
import { BenefitTracker } from './improvement/BenefitTracker';
import { ImprovementsLayout } from './improvement/ImprovementsLayout';
import { BIAMatrixPage } from './continuity/BIAMatrix';
import { DRPlans } from './continuity/DRPlans';
import { DRTests } from './continuity/DRTests';
import { MeasurementLayout } from './measurement/MeasurementLayout';
import { DashboardsIndex } from './measurement/DashboardsIndex';
import { ExecutiveDashboard } from './measurement/ExecutiveDashboard';
import { Reports } from './measurement/Reports';
import { ReportBuilder } from './measurement/ReportBuilder';
import { MetricCatalog } from './measurement/MetricCatalog';
import { Inbox } from './platform/Inbox';
import NotificationPreferences from './platform/NotificationPreferences';
import Notifications from './platform/Notifications';
import { OnCallLayout } from './platform/OnCallLayout';
import { OnCall } from './platform/OnCall';
import { OnCallSchedule } from './platform/OnCallSchedule';
import { OnCallOverrides } from './platform/OnCallOverrides';
import StatusPage from './platform/StatusPage';
import { Profile } from './platform/Profile';
import { Settings } from './platform/Settings';
import { AiWorkspace } from './ai/AiWorkspace';
import { AdminLayout } from './admin/AdminLayout';
import { AdminOverview } from './admin/AdminOverview';
import { Divisions } from './admin/Divisions';
import { Departments } from './admin/Departments';
import { Teams as AdminTeams } from './admin/Teams';
import { Users as AdminUsers } from './admin/Users';
import { Applications as AdminApplications } from './admin/Applications';
import { Roles as AdminRoles } from './admin/Roles';
import { Permissions as AdminPermissions } from './admin/Permissions';
import { RequireAuth } from '../components/auth/RequireAuth';

export const routes: RouteObject[] = [
  { path: '/login',         element: <Login /> },
  {
    element: <RequireAuth />,
    children: [{
    path: '/',
    element: <AppShell />,
    children: [
      { index: true,                            element: <Dashboard /> },
      // Doc 1 — CMDB
      { path: 'cmdb',                           element: <CMDBList /> },
      { path: 'cmdb/graph',                     element: <CMDBGraph /> },
      { path: 'cmdb/audit',                     element: <CMDBAudit /> },
      { path: 'cmdb/:ciId',                     element: <CMDBDetail /> },
      // Doc 2 — Monitoring (tab layout)
      { path: 'monitoring', element: <MonitoringLayout />, children: [
        { index: true,           element: <MonitoringOverview /> },
        { path: 'events',        element: <EventStream /> },
        { path: 'rules',         element: <MonitoringRules /> },
        { path: 'routing',       element: <AlertRouting /> },
        { path: 'coverage',      element: <CoverageReport /> },
      ]},
      { path: 'monitoring/events/:id',          element: <EventDetail /> },
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
      { path: 'portal', element: <PortalLayout />, children: [
        { index: true,             element: <PortalHome /> },
        { path: 'catalog',         element: <Catalog /> },
        { path: 'my-requests',     element: <MyRequests /> },
      ]},
      { path: 'portal/catalog/:itemId',         element: <CatalogItemDetail /> },
      { path: 'kb', element: <KBLayout />, children: [
        { index: true,        element: <KBBrowse /> },
        { path: 'analytics',  element: <KBAnalytics /> },
        { path: 'editor',     element: <KBEditor /> },
      ]},
      { path: 'kb/editor/:slug',                element: <KBEditor /> },
      { path: 'kb/:slug',                       element: <ArticleView /> },
      // Doc 4 — Change & Delivery
      { path: 'changes',                        element: <ChangeCalendar /> },
      { path: 'changes/new',                    element: <NewChange /> },
      { path: 'changes/calendar',               element: <ChangeCalendar /> },
      { path: 'changes/cab',                    element: <CABWorkspace /> },
      { path: 'changes/:changeId',              element: <ChangeDetail /> },
      { path: 'releases', element: <ReleasesLayout />, children: [
        { index: true,        element: <ReleasesList /> },
        { path: 'pipeline',   element: <ReleasePipeline /> },
        { path: 'notes',      element: <ReleaseNotes /> },
      ]},
      { path: 'releases/:releaseId',            element: <ReleaseDetail /> },
      { path: 'deployments', element: <DeploymentsLayout />, children: [
        { index: true, element: <DeploymentsQueue /> },
      ]},
      { path: 'deployments/:deploymentId',      element: <DeploymentDetail /> },
      { path: 'environments', element: <DeploymentsLayout />, children: [
        { index: true, element: <Environments /> },
      ]},
      { path: 'testing', element: <TestingLayout />, children: [
        { path: 'plans',    element: <TestPlans /> },
        { path: 'cases',    element: <TestCases /> },
        { path: 'runs',     element: <TestRuns /> },
        { path: 'sign-off', element: <SignOffQueue /> },
      ]},
      // Doc 5 — Service Health & Intelligence
      { path: 'availability', element: <AvailabilityLayout />, children: [
        { index: true,          element: <AvailabilityDashboard /> },
        { path: 'sla',          element: <SLATargets /> },
        { path: 'outages',      element: <Outages /> },
      ]},
      { path: 'capacity', element: <CapacityLayout />, children: [
        { index: true,        element: <CapacityDashboard /> },
        { path: 'forecast',   element: <CapacityForecast /> },
        { path: 'thresholds', element: <CapacityThresholds /> },
      ]},
      { path: 'continuity', element: <ContinuityLayout />, children: [
        { path: 'bia',       element: <BIAMatrixPage /> },
        { path: 'dr-plans',  element: <DRPlans /> },
        { path: 'tests',     element: <DRTests /> },
      ]},
      { path: 'dashboards', element: <MeasurementLayout />, children: [
        { index: true,  element: <DashboardsIndex /> },
        { path: 'exec', element: <ExecutiveDashboard /> },
      ]},
      { path: 'reports', element: <MeasurementLayout />, children: [
        { index: true, element: <Reports /> },
      ]},
      { path: 'reports/builder',                 element: <ReportBuilder /> },
      { path: 'metrics', element: <MeasurementLayout />, children: [
        { path: 'catalog', element: <MetricCatalog /> },
      ]},
      { path: 'improvement', element: <ImprovementsLayout />, children: [
        { index: true,        element: <ImprovementRegister /> },
        { path: 'kanban',     element: <ImprovementKanban /> },
        { path: 'heatmap',    element: <ImprovementHeatmap /> },
        { path: 'benefits',   element: <BenefitTracker /> },
      ]},
      // Detail page lives outside the tab layout
      { path: 'improvement/:initiativeId', element: <ImprovementDetail /> },
      // Doc 6 — Platform Features
      { path: 'inbox',                          element: <Inbox /> },
      { path: 'notifications/preferences',      element: <NotificationPreferences /> },
      { path: 'notifications',                  element: <Notifications /> },
      { path: 'on-call', element: <OnCallLayout />, children: [
        { index: true,        element: <OnCall /> },
        { path: 'schedule',   element: <OnCallSchedule /> },
        { path: 'overrides',  element: <OnCallOverrides /> },
      ]},
      { path: 'status',                         element: <StatusPage /> },
      { path: 'profile',                        element: <Profile /> },
      // Settings
      { path: 'settings',                       element: <Settings /> },
      // RBAC Admin (superadmin only)
      { path: 'admin', element: <AdminLayout />, children: [
        { index: true,             element: <AdminOverview /> },
        { path: 'divisions',       element: <Divisions /> },
        { path: 'departments',     element: <Departments /> },
        { path: 'teams',           element: <AdminTeams /> },
        { path: 'users',           element: <AdminUsers /> },
        { path: 'applications',    element: <AdminApplications /> },
        { path: 'roles',           element: <AdminRoles /> },
        { path: 'permissions',     element: <AdminPermissions /> },
      ]},
      // 404
      { path: '*',                              element: <NotFound /> },
      // AI Workspace
      { path: 'ai',            element: <AiWorkspace /> },
      { path: 'ai/:sessionId', element: <AiWorkspace /> },
    ]
  }],
  },
];
