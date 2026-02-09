/**
 * Nova Sentinel Logo - Clean Concentric Circles
 * Represents layered security + AI intelligence with concentric rings
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
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { duration: 0.5, ease: 'easeOut' }
      } : {})}
    >
      <defs>
        <linearGradient id="logoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="logoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="logoGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#DDD6FE" />
        </linearGradient>
        <filter id="logoGlow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Outer ring */}
      <circle cx="24" cy="24" r="22" fill="none" stroke="url(#logoGrad3)" strokeWidth="2" opacity="0.5" />
      
      {/* Middle ring */}
      <circle cx="24" cy="24" r="16" fill="none" stroke="url(#logoGrad2)" strokeWidth="2.5" opacity="0.7" />
      
      {/* Inner ring */}
      <circle cx="24" cy="24" r="10" fill="none" stroke="url(#logoGrad1)" strokeWidth="3" opacity="0.9" />
      
      {/* Core */}
      <circle cx="24" cy="24" r="5" fill="url(#logoGrad1)" filter="url(#logoGlow)" />
      
      {/* Bright center dot */}
      <circle cx="24" cy="24" r="2" fill="white" opacity="0.95" />

      {/* Orbital dots */}
      <circle cx="24" cy="2" r="1.5" fill="#818CF8" opacity="0.6" />
      <circle cx="40" cy="24" r="1.5" fill="#A78BFA" opacity="0.5" />
      <circle cx="24" cy="46" r="1.5" fill="#818CF8" opacity="0.6" />
      <circle cx="8" cy="24" r="1.5" fill="#A78BFA" opacity="0.5" />
    </Wrapper>
  );
};

export default NovaSentinelLogo;
