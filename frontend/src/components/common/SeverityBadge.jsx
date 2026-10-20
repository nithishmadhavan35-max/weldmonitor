import React from 'react';
import { AlertCircle, AlertTriangle, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

export const SeverityBadge = ({ severity = 'INFO' }) => {
  const configs = {
    CRITICAL: {
      label: 'Critical',
      icon: ShieldAlert,
      classes: 'badge-red',
    },
    WARNING: {
      label: 'Warning',
      icon: AlertTriangle,
      classes: 'badge-yellow',
    },
    INFO: {
      label: 'Info',
      icon: AlertCircle,
      classes: 'badge-blue',
    },
  };

  const config = configs[severity] || configs.INFO;
  const Icon = config.icon;

  return (
    <span className={`badge ${config.classes} font-mono`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

export const AlertStateBadge = ({ state = 'OPEN' }) => {
  const configs = {
    OPEN:          { label: 'Open',          classes: 'badge-red' },
    ACKNOWLEDGED:  { label: 'Acknowledged',  classes: 'badge-yellow' },
    INVESTIGATING: { label: 'Investigating', classes: 'badge-blue' },
    RESOLVED:      { label: 'Resolved',      classes: 'badge-green' },
    CLOSED:        { label: 'Closed',        classes: 'badge-gray' },
  };

  const config = configs[state] || configs.OPEN;

  return (
    <span className={`badge ${config.classes} font-mono`}>
      {config.label}
    </span>
  );
};
