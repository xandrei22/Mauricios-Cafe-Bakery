import React from 'react';
import { cn } from '../../lib/utils';

interface RatingBarProps {
  value: number;
  className?: string;
}

const RatingBar: React.FC<RatingBarProps> = ({ value, className }) => {
  // Create a unique class name based on the value for CSS targeting
  const valueClass = `rating-bar-value-${Math.round(value)}`;

  return (
    <div 
      className={cn("rating-bar", valueClass, className)}
      data-value={value}
    />
  );
};

export default RatingBar;
