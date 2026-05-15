import React from 'react';
import { Settings, LogOut, Moon, UserCircle, LayoutGrid } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useNavigate } from 'react-router-dom';
import { usersService, teamsService, useResource } from '@/src/services';

interface UserMenuProps {
  onClose: () => void;
}

function roleLabel(role: string | undefined): string {
  if (!role) return 'User';
  return role.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

export const UserMenu: React.FC<UserMenuProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { data: currentUser } = useResource(() => usersService.current(), []);
  const { data: teams } = useResource(() => teamsService.list(), []);

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div 
      className="absolute right-0 mt-2 w-64 bg-white border border-ois-border rounded-ois-card shadow-ois-dropdown overflow-hidden z-50 py-1"
      onMouseLeave={onClose}
    >
      <div className="px-4 py-3 border-b border-ois-border mb-1">
        <div className="font-bold text-ois-text">{currentUser?.name ?? ''}</div>
        <div className="text-xs text-ois-text-subtle truncate">{currentUser?.email ?? ''}</div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-ois-primary-pale text-ois-primary uppercase">
            {roleLabel(currentUser?.role)}
          </span>
          <span className="text-[11px] text-ois-text-muted font-medium">•</span>
          <span className="text-[11px] text-ois-text-muted font-medium truncate">
            {currentUser?.team ? (teams?.find(t => t.id === currentUser.team)?.name ?? 'Unassigned') : 'Unassigned'}
          </span>
        </div>
      </div>

      <MenuItem icon={<UserCircle size={16} />} label="Profile" onClick={() => { navigate('/profile'); onClose(); }} />
      <MenuItem icon={<LayoutGrid size={16} />} label="App Catalog" onClick={() => { navigate('/applications/catalog'); onClose(); }} />
      <MenuItem icon={<Settings size={16} />} label="Preferences" onClick={() => { navigate('/notifications/preferences'); onClose(); }} />
      <MenuItem icon={<Settings size={16} />} label="Settings" onClick={() => { navigate('/settings'); onClose(); }} />
      <MenuItem icon={<Moon size={16} />} label="Toggle theme" trailing={<span className="text-[10px] font-bold text-ois-text-subtle">MOCK</span>} />
      
      <div className="h-px bg-ois-border my-1" />
      
      <MenuItem icon={<LogOut size={16} />} label="Sign out" onClick={handleLogout} className="text-ois-danger hover:bg-red-50" />
    </div>
  );
};

const MenuItem: React.FC<{ icon: React.ReactNode, label: string, onClick?: () => void, className?: string, trailing?: React.ReactNode }> = ({ icon, label, onClick, className, trailing }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-2 text-sm text-ois-text hover:bg-ois-surface-muted transition-colors transition-all",
      className
    )}
  >
    <div className="shrink-0 opacity-70 group-hover:opacity-100">{icon}</div>
    <span className="flex-1 text-left font-medium">{label}</span>
    {trailing && <div className="shrink-0">{trailing}</div>}
  </button>
);
