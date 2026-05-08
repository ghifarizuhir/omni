import React from 'react';
import { RouteObject } from 'react-router-dom';
import { AppShell } from '@/src/components/layout/AppShell';
import { Login } from './Login';
import { Dashboard } from './Dashboard';
import { Placeholder } from './Placeholder';
import { CMDBList } from './cmdb/CMDBList';
import { CMDBDetail } from './cmdb/CMDBDetail';
import { CMDBGraph } from './cmdb/CMDBGraph';
import { CMDBAudit } from './cmdb/CMDBAudit';
import { EventStream } from './monitoring/EventStream';
import { EventDetail } from './monitoring/EventDetail';
import { MonitoringRules } from './monitoring/MonitoringRules';
import { AlertRouting } from './monitoring/AlertRouting';
import { CoverageReport } from './monitoring/CoverageReport';
import { NotFound } from './NotFound';

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
      { path: 'events',                         element: <EventStream /> },
      { path: 'events/:id',                     element: <EventDetail /> },
      { path: 'monitoring/rules',               element: <MonitoringRules /> },
      { path: 'monitoring/routing',             element: <AlertRouting /> },
      { path: 'monitoring/coverage',            element: <CoverageReport /> },
      // Doc 3 — Operational Response
      { path: 'incidents',                      element: <Placeholder module="Incidents" doc="Doc 3" /> },
      { path: 'incidents/:id',                  element: <Placeholder module="Incident Detail" doc="Doc 3" /> },
      { path: 'incidents/major/:id',            element: <Placeholder module="Major Incident" doc="Doc 3" /> },
      { path: 'incidents/analytics',            element: <Placeholder module="Incident Analytics" doc="Doc 3" /> },
      { path: 'problems',                       element: <Placeholder module="Problems" doc="Doc 3" /> },
      { path: 'problems/:id',                   element: <Placeholder module="Problem Detail" doc="Doc 3" /> },
      { path: 'problems/:id/rca',               element: <Placeholder module="RCA" doc="Doc 3" /> },
      { path: 'kedb',                           element: <Placeholder module="KEDB" doc="Doc 3" /> },
      { path: 'requests',                       element: <Placeholder module="Service Requests" doc="Doc 3" /> },
      { path: 'portal',                         element: <Placeholder module="Self-Service Portal" doc="Doc 3" /> },
      { path: 'kb',                             element: <Placeholder module="Knowledge Base" doc="Doc 3" /> },
      // Doc 4 — Change & Delivery
      { path: 'changes',                        element: <Placeholder module="Changes" doc="Doc 4" /> },
      { path: 'releases',                       element: <Placeholder module="Releases" doc="Doc 4" /> },
      { path: 'deployments',                    element: <Placeholder module="Deployments" doc="Doc 4" /> },
      // Doc 5 — Service Health & Intelligence
      { path: 'availability',                   element: <Placeholder module="Availability" doc="Doc 5" /> },
      { path: 'capacity',                       element: <Placeholder module="Capacity" doc="Doc 5" /> },
      { path: 'reports',                        element: <Placeholder module="Reports" doc="Doc 5" /> },
      { path: 'improvement',                    element: <Placeholder module="Improvements" doc="Doc 5" /> },
      // Doc 6 — Platform Features
      { path: 'inbox',                          element: <Placeholder module="Inbox" doc="Doc 6" /> },
      { path: 'notifications',                  element: <Placeholder module="Notifications" doc="Doc 6" /> },
      { path: 'oncall',                         element: <Placeholder module="On-Call" doc="Doc 6" /> },
      { path: 'status',                         element: <Placeholder module="Status Page" doc="Doc 6" /> },
      // Settings
      { path: 'settings',                       element: <Placeholder module="Settings" doc="Future" /> },
      // 404
      { path: '*',                              element: <NotFound /> },
    ]
  },
];
