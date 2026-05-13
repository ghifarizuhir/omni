import React from 'react';
import type { RbacModule, RbacAction, RbacResource } from '@/src/types/rbac';
import { useCurrentUser } from './CurrentUserContext';
import { can } from './engine';

interface CanProps {
  module: RbacModule;
  action: RbacAction;
  variant?: string;
  resource?: RbacResource;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// Show children only when current user is permitted to perform the action.
export const Can: React.FC<CanProps> = ({
  module, action, variant, resource, fallback = null, children,
}) => {
  const { user, applications, teams, departments } = useCurrentUser();
  const result = can(user, module, action, {
    variant, resource, applications, teams, departments,
  });
  return <>{result.allowed ? children : fallback}</>;
};

export function useCan(
  module: RbacModule,
  action: RbacAction,
  opts?: { variant?: string; resource?: RbacResource },
): boolean {
  const { user, applications, teams, departments } = useCurrentUser();
  return can(user, module, action, {
    ...opts, applications, teams, departments,
  }).allowed;
}
