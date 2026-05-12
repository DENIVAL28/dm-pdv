import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const ICONS = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

export default function FeedbackBanner({ tone = 'info', children }) {
  const Icon = ICONS[tone] || ICONS.info;

  return (
    <div className={`feedback-banner ${tone}`}>
      <Icon size={18} />
      <span>{children}</span>
    </div>
  );
}
