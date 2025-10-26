import React from 'react';
import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
  variant?: 'amber' | 'gradient';
  'aria-label'?: string;
  title?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  className, 
  variant = 'amber',
  'aria-label': ariaLabel,
  title 
}) => {
  const baseClasses = "progress-bar";
  const variantClasses = {
    amber: "progress-bar-amber",
    gradient: "progress-bar-gradient"
  };

  // Create a unique class name based on the value for CSS targeting
  const valueClass = `progress-bar-value-${Math.round(value)}`;

  return (
    <div 
      className={cn(baseClasses, variantClasses[variant], valueClass, className)}
      data-value={value}
      aria-label={ariaLabel}
      title={title}
    />
  );
};

export default ProgressBar;
