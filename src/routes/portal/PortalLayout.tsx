import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, BookOpen, Inbox } from 'lucide-react';
import { requestsService, useResource } from '@/src/services';
import { cn } from '@/src/lib/utils';

const TABS = [
  { label: 'Home',         to: '/portal',              icon: Home,     end: true },
  { label: 'Catalog',      to: '/portal/catalog',      icon: BookOpen },
  { label: 'My Requests',  to: '/portal/my-requests',  icon: Inbox },
];

export const PortalLayout: React.FC = () => {
  const { data: catalogData } = useResource(() => requestsService.catalog(), []);
  const { data: requestsData } = useResource(() => requestsService.list(), []);
  const mockCatalogItems = catalogData ?? [];
  const mockServiceRequests = requestsData ?? [];
  const catalogCount = mockCatalogItems.length;

  const pendingUser = mockServiceRequests.filter(r => r.status === 'pending_user').length;
  const inFulfillment = mockServiceRequests.filter(r => r.status === 'in_fulfillment').length;
  const submitted = mockServiceRequests.filter(r => r.status === 'submitted').length;
  const active = pendingUser + inFulfillment + submitted;

  const accentColor =
    pendingUser > 0    ? '#DC6803' :
    inFulfillment > 0  ? '#1F4FD4' :
    '#12B76A';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">
        <div className="flex items-stretch">
          <div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
          <div className="flex-1 px-6 py-4">
            <h1 className="text-xl font-bold text-ois-text">Service Portal</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap">
              <span className="font-medium text-ois-text">{catalogCount} catalog items</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{active} active requests</span>
              {inFulfillment > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span>{inFulfillment} in fulfillment</span>
                </>
              )}
              {pendingUser > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-warning">{pendingUser} need your input</span>
                </>
              )}
            </div>
          </div>
        </div>

        <nav className="flex px-4 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => cn(
                'flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                isActive
                  ? 'border-ois-primary text-ois-primary'
                  : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong',
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};
