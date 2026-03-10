/**
 * Architecture Canvas — Premium AWS diagram for Live Simulation
 * Clear layout with flow lines, AWS-style icons
 */
import React from 'react';
import { motion } from 'framer-motion';

interface ArchitectureCanvasProps {
  scenarioId: string;
  attackerPosition: 'internet' | 'iam' | 'ec2' | 's3' | 'contained' | null;
  compromisedResources: Set<string>;
  remediationStep: number;
}

// AWS Architecture Icons style — simplified representations
// Official icons: https://aws.amazon.com/architecture/icons/
const AwsIcons = {
  Internet: () => (
    <svg viewBox="0 0 48 48" className="w-8 h-8" stroke="currentColor" fill="none">
      <circle cx="24" cy="24" r="10" strokeWidth="2" />
      <path d="M24 4v6M24 38v6M4 24h6M38 24h6M10.3 10.3l4.2 4.2M33.5 33.5l4.2 4.2M10.3 37.7l4.2-4.2M33.5 14.5l4.2-4.2" strokeWidth="1.5" />
    </svg>
  ),
  IAM: () => (
    <svg viewBox="0 0 48 48" className="w-8 h-8" stroke="currentColor" fill="none">
      <path d="M24 4L8 12v24l16 8 16-8V12L24 4z" strokeWidth="2" />
      <path d="M24 18v12M18 24h12" strokeWidth="2" />
    </svg>
  ),
  EC2: () => (
    <svg viewBox="0 0 48 48" className="w-8 h-8" stroke="currentColor" fill="none">
      <rect x="8" y="12" width="32" height="24" rx="2" strokeWidth="2" />
      <path d="M8 20h32M8 28h32" strokeWidth="1.5" />
    </svg>
  ),
  S3: () => (
    <svg viewBox="0 0 48 48" className="w-8 h-8" stroke="currentColor" fill="none">
      <path d="M8 16h32l-4 8 4 8H8l4-8-4-8z" strokeWidth="2" />
    </svg>
  ),
  SecurityGroup: () => (
    <svg viewBox="0 0 48 48" className="w-8 h-8" stroke="currentColor" fill="none">
      <path d="M24 8l-16 6v10c0 10 7 18 16 20 9-2 16-10 16-20V14l-16-6z" strokeWidth="2" />
    </svg>
  ),
  CloudTrail: () => (
    <svg viewBox="0 0 48 48" className="w-8 h-8" stroke="currentColor" fill="none">
      <circle cx="24" cy="24" r="10" strokeWidth="2" />
      <path d="M24 14v10l6 6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

const Node: React.FC<{
  label: string;
  icon: React.ReactNode;
  compromised?: boolean;
  remediated?: boolean;
  delay?: number;
}> = ({ label, icon, compromised, remediated, delay = 0 }) => {
  const isHealthy = !compromised || remediated;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className={`
        relative flex flex-col items-center justify-center rounded-xl border-2 px-4 py-3 min-w-[90px]
        shadow-lg backdrop-blur-sm
        ${compromised && !remediated
          ? 'bg-gradient-to-b from-red-950/90 to-red-950/70 border-red-500/80'
          : remediated
            ? 'bg-slate-800/95 border-emerald-500/60'
            : 'bg-slate-800/95 border-slate-600/80'
        }
      `}
    >
      {compromised && !remediated && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-red-500/10 pointer-events-none"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}
      <div className="relative z-10" style={{ color: isHealthy ? '#FF9900' : '#f87171' }}>{icon}</div>
      <span className="relative z-10 mt-1.5 text-[10px] font-medium text-slate-400">{label}</span>
    </motion.div>
  );
};

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = ({
  scenarioId: _scenarioId,
  attackerPosition,
  compromisedResources,
  remediationStep,
}) => {
  const iamCompromised = compromisedResources.has('iam') && remediationStep < 2;
  const ec2Compromised = compromisedResources.has('ec2') && remediationStep < 3;
  const sgCompromised = compromisedResources.has('sg') && remediationStep < 4;
  const s3Compromised = compromisedResources.has('s3') && remediationStep < 2;

  // Attacker position as index for smooth path (0=internet, 1=iam, 2=ec2, 3=s3)
  const posIndex =
    attackerPosition === 'internet' ? 0
    : attackerPosition === 'iam' ? 1
    : attackerPosition === 'ec2' ? 2
    : attackerPosition === 's3' ? 3
    : -1;

  return (
    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center p-4">
      {/* Layout: Internet | IAM | EC2 | S3 | CloudTrail with Security Group below EC2 */}
      <div className="relative flex items-center gap-6 max-w-[520px]">
        {/* Internet - left */}
        <Node label="Internet" icon={<AwsIcons.Internet />} delay={0.1} />

        {/* Connector */}
        <div className="w-2 h-0.5 bg-slate-600/60 rounded" />

        {/* VPC boundary */}
        <div className="relative flex items-center gap-4 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-600/80 bg-slate-950/50">
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950 rounded">
            VPC
          </span>

            <Node label="IAM" icon={<AwsIcons.IAM />} compromised={iamCompromised} remediated={remediationStep >= 2} delay={0.15} />
          <div className="flex flex-col items-center gap-2">
            <Node label="EC2" icon={<AwsIcons.EC2 />} compromised={ec2Compromised} remediated={remediationStep >= 3} delay={0.2} />
            <Node label="Security Group" icon={<AwsIcons.SecurityGroup />} compromised={sgCompromised} remediated={remediationStep >= 4} delay={0.3} />
          </div>
            <Node label="S3" icon={<AwsIcons.S3 />} compromised={s3Compromised} remediated={remediationStep >= 2} delay={0.25} />
        </div>

        {/* Connector */}
        <div className="w-2 h-0.5 bg-slate-600/60 rounded" />

        {/* CloudTrail - right */}
        <Node label="CloudTrail" icon={<AwsIcons.CloudTrail />} delay={0.35} />
      </div>

      {/* Attacker indicator - smooth sliding dot along the flow path */}
      {posIndex >= 0 && attackerPosition !== 'contained' && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 z-20 pointer-events-none"
          initial={false}
          animate={{
            left: ['10%', '26%', '42%', '58%'][posIndex] ?? '10%',
          }}
          transition={{ type: 'tween', duration: 0.5, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 12px rgba(239,68,68,0.7)' }}
        >
          <motion.div
            className="absolute -inset-1 rounded-full border-2 border-red-400/60"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        </motion.div>
      )}
    </div>
  );
};
