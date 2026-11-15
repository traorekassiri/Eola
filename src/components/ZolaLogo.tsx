import React from 'react';
import { useI18n } from '../lib/i18n';

interface ZolaLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ZolaLogo: React.FC<ZolaLogoProps> = ({ size = 'md', className = '' }) => {
  const { brandName } = useI18n();
  const dims = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <span className={`inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0 ${className}`}>
      <svg className={dims} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="zolaHeartGrad" x1="4" y1="6" x2="36" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFB347" />
            <stop offset="50%" stopColor="#FF6B1A" />
            <stop offset="100%" stopColor="#E62E2D" />
          </linearGradient>
        </defs>
        <path
          d="M20 34.5C20 34.5 6 25.6 6 15.2C6 10.6 9.6 7 14.1 7C16.8 7 19.1 8.4 20 10.4C20.9 8.4 23.2 7 25.9 7C30.4 7 34 10.6 34 15.2C34 25.6 20 34.5 20 34.5Z"
          stroke="url(#zolaHeartGrad)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15.5 14.5H24.5L15.8 23.5H24.5"
          stroke="url(#zolaHeartGrad)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`font-display font-extrabold tracking-tight ${textSize} bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 bg-clip-text text-transparent`}>
        {brandName}
      </span>
    </span>
  );
};
