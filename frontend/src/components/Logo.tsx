/**
 * Nova Sentinel Logo - Premium Animated Shield + Neural Network
 * Represents layered security intelligence with AI neural connections
 */
import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export const NovaSentinelLogo: React.FC<LogoProps> = ({ size = 40, className = '', animated = true }) => {
  const Wrapper = animated ? motion.svg : 'svg' as any;
  
  return (
    <Wrapper
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...(animated ? {
        initial: { rotate: -10, scale: 0.9 },
        animate: { rotate: 0, scale: 1 },
        transition: { duration: 0.5, ease: 'easeOut' }
      } : {})}
    >
      <defs>
        <linearGradient id="novaShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="novaInnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </linearGradient>
        <linearGradient id="novaCoreGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#E0E7FF" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <filter id="novaGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Shield Shape - outer */}
      <path 
        d="M24 4L6 12V22C6 33.1 13.8 43.4 24 46C34.2 43.4 42 33.1 42 22V12L24 4Z"
        fill="url(#novaShieldGrad)"
        opacity="0.15"
        stroke="url(#novaShieldGrad)"
        strokeWidth="1.5"
      />
      
      {/* Shield Shape - inner */}
      <path 
        d="M24 8L10 14.5V22.5C10 31.4 16.2 39.7 24 41.8C31.8 39.7 38 31.4 38 22.5V14.5L24 8Z"
        fill="url(#novaShieldGrad)"
        opacity="0.3"
      />
      
      {/* Neural network nodes */}
      <circle cx="24" cy="20" r="4" fill="url(#novaCoreGrad)" filter="url(#novaGlow)" />
      <circle cx="16" cy="28" r="2.5" fill="url(#novaInnerGrad)" opacity="0.8" />
      <circle cx="32" cy="28" r="2.5" fill="url(#novaInnerGrad)" opacity="0.8" />
      <circle cx="20" cy="34" r="2" fill="url(#novaInnerGrad)" opacity="0.6" />
      <circle cx="28" cy="34" r="2" fill="url(#novaInnerGrad)" opacity="0.6" />
      
      {/* Neural connections */}
      <line x1="24" y1="20" x2="16" y2="28" stroke="url(#novaInnerGrad)" strokeWidth="1" opacity="0.5" />
      <line x1="24" y1="20" x2="32" y2="28" stroke="url(#novaInnerGrad)" strokeWidth="1" opacity="0.5" />
      <line x1="16" y1="28" x2="20" y2="34" stroke="url(#novaInnerGrad)" strokeWidth="0.8" opacity="0.4" />
      <line x1="32" y1="28" x2="28" y2="34" stroke="url(#novaInnerGrad)" strokeWidth="0.8" opacity="0.4" />
      <line x1="16" y1="28" x2="32" y2="28" stroke="url(#novaInnerGrad)" strokeWidth="0.8" opacity="0.3" />
      <line x1="20" y1="34" x2="28" y2="34" stroke="url(#novaInnerGrad)" strokeWidth="0.8" opacity="0.3" />
      
      {/* Central AI eye */}
      <circle cx="24" cy="20" r="2" fill="white" opacity="0.9" />
    </Wrapper>
  );
};

export default NovaSentinelLogo;
