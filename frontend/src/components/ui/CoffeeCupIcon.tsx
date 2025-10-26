import React from 'react';

interface CoffeeCupIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const CoffeeCupIcon: React.FC<CoffeeCupIconProps> = ({ 
  className = '', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-10 h-10'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        className="w-full h-full"
      >
        {/* Coffee cup body */}
        <path
          d="M6 2C6 1.44772 6.44772 1 7 1H15C15.5523 1 16 1.44772 16 2V4H18C18.5523 4 19 4.44772 19 5V7C19 7.55228 18.5523 8 18 8H17V18C17 19.1046 16.1046 20 15 20H7C5.89543 20 5 19.1046 5 18V8H4C3.44772 8 3 7.55228 3 7V5C3 4.44772 3.44772 4 4 4H6V2Z"
          fill="currentColor"
        />
        
        {/* Coffee cup handle */}
        <path
          d="M17 6H18C18.5523 6 19 6.44772 19 7V8H17V6Z"
          fill="currentColor"
        />
        
        {/* Steam lines */}
        <path
          d="M8 3C8 2.44772 8.44772 2 9 2C9.55228 2 10 2.44772 10 3C10 3.55228 9.55228 4 9 4C8.44772 4 8 3.55228 8 3Z"
          fill="currentColor"
        />
        <path
          d="M11 2.5C11 2.22386 11.2239 2 11.5 2C11.7761 2 12 2.22386 12 2.5C12 2.77614 11.7761 3 11.5 3C11.2239 3 11 2.77614 11 2.5Z"
          fill="currentColor"
        />
        <path
          d="M13 3C13 2.44772 13.4477 2 14 2C14.5523 2 15 2.44772 15 3C15 3.55228 14.5523 4 14 4C13.4477 4 13 3.55228 13 3Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
};

export default CoffeeCupIcon;






