import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';

const ROLE_DESCRIPTIONS = {
  ADMIN:                'Administrator — full system control, user management, and machine configuration.',
  OPERATOR:             'Welding Operator — live monitoring, defect recording, and floor operations.',
  MAINTENANCE_ENGINEER: 'Maintenance Engineer — machine health, alerts, task scheduling, and fault resolution.',
  PRODUCTION_MANAGER:   'Production Manager — output tracking, downtime analytics, and report exports.',
};

export const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="h-screen flex flex-col bg-[--surface-bg] overflow-hidden">
      {/* Top navbar */}
      <Navbar onMenuClick={() => setMobileOpen(true)} />

      {/* Below navbar: sidebar + content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {/* Role banner */}
          {user && (
            <div className="border-b border-[--border] bg-white px-6 py-2.5 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
              <p className="text-xs text-neutral-500">
                <span className="font-semibold text-neutral-700">
                  {user.role?.replace(/_/g, ' ')}
                </span>
                {' — '}
                {ROLE_DESCRIPTIONS[user.role] || 'Read-only monitoring access.'}
              </p>
            </div>
          )}

          {/* Page content */}
          <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
