import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useAuth, DEMO_USERS } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const ROLE_COLORS = {
  ADMIN:                { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
  OPERATOR:             { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  MAINTENANCE_ENGINEER: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  PRODUCTION_MANAGER:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200' },
};

const ROLE_LABELS = {
  ADMIN:                'Admin',
  OPERATOR:             'Operator',
  MAINTENANCE_ENGINEER: 'Maintenance',
  PRODUCTION_MANAGER:   'Manager',
};

export const Navbar = ({ onMenuClick }) => {
  const { user, quickDemoLogin, isAuthenticated } = useAuth();
  const { isConnected, isDataStale } = useSocket();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (roleRef.current && !roleRef.current.contains(e.target)) {
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roleStyle = ROLE_COLORS[user?.role] || { bg: 'bg-neutral-50', text: 'text-neutral-600', border: 'border-neutral-200' };

  return (
    <header className="top-navbar">
      {/* Left: Hamburger (mobile) + Brand */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo.png"
            alt="WeldMonitor Logo"
            className="h-8.5 w-auto object-contain flex-shrink-0"
            style={{ height: '34px' }}
          />
          <span className="font-display font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight hidden sm:block">
            Weld <span className="text-blue-600">Monitor</span>
          </span>
        </Link>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm whitespace-nowrap">
          {isConnected && !isDataStale ? (
            <>
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
              </span>
              <Wifi className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="text-slate-800 font-medium">
                <span className="text-emerald-700 font-bold">Live</span> · 5s Stream
              </span>
            </>
          ) : isConnected && isDataStale ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
              <WifiOff className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span className="text-amber-800 font-medium">Stale Stream</span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
              <WifiOff className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
              <span className="text-rose-800 font-medium">Offline</span>
            </>
          )}
        </div>

        {/* Switch User Role */}
        {isAuthenticated && (
          <div className="relative" ref={roleRef}>
            <button
              onClick={() => setRoleMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-sm transition-colors"
              title="Switch demo user role"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline text-slate-700">Role:</span>
              <span className="font-bold text-blue-700">
                {ROLE_LABELS[user?.role] || 'Role'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
            </button>

            {roleMenuOpen && (
              <div className="dropdown-menu absolute right-0 mt-1.5 z-50 w-56 shadow-lg border border-slate-200">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 rounded-t-md">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Switch Demo Role
                  </p>
                </div>
                {Object.entries(DEMO_USERS).map(([roleKey, info]) => (
                  <button
                    key={roleKey}
                    onClick={async () => {
                      setRoleMenuOpen(false);
                      await quickDemoLogin(roleKey);
                    }}
                    className={`dropdown-item ${user?.role === roleKey ? 'active' : ''}`}
                  >
                    <span className="flex-1 font-medium">{info.label}</span>
                    {user?.role === roleKey && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!isAuthenticated && (
          <Link
            to="/login"
            className="btn-primary text-xs py-1.5 px-3"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
