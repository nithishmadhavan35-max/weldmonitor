import React from 'react';
import { Activity, PauseCircle, StopCircle, AlertOctagon } from 'lucide-react';

export const StatusBadge = ({ state = 'IDLE', size = 'md', showPulse = true }) => {
  const configs = {
    RUNNING: {
      label: 'Running',
      icon: Activity,
      classes: 'badge-green',
      dotClass: 'bg-success',
    },
    IDLE: {
      label: 'Idle',
      icon: PauseCircle,
      classes: 'badge-yellow',
      dotClass: 'bg-warning',
    },
    STOPPED: {
      label: 'Stopped',
      icon: StopCircle,
      classes: 'badge-gray',
      dotClass: 'bg-neutral-400',
    },
    ERROR: {
      label: 'Fault',
      icon: AlertOctagon,
      classes: 'badge-red',
      dotClass: 'bg-danger',
    },
  };

  const config = configs[state] || configs.IDLE;
  const Icon = config.icon;

  return (
    <span className={`badge ${config.classes} font-mono`}>
      <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
        {showPulse && (state === 'RUNNING' || state === 'ERROR') && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${config.dotClass}`} />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dotClass}`} />
      </span>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </span>
  );
};
