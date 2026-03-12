/**
 * Nova Sentinel - Autonomous Security Intelligence Platform
 * Enterprise sidebar layout with clearly named features
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, AlertCircle, CheckCircle2, Menu, X, ChevronRight, ChevronDown,
  Loader2, Eye, Brain, Zap, Shield, FileText, Mic, MessageSquare, Volume2,
  Home, ArrowLeft
} from 'lucide-react';
import NovaSentinelLogo from './components/Logo';
import LandingHero from './components/Landing/LandingHero';
import FeaturesSection from './components/Landing/FeaturesSection';
import UnderTheHoodSection from './components/Landing/UnderTheHoodSection';
import NovaModelsSection from './components/Landing/NovaModelsSection';
import FAQSection from './components/Landing/FAQSection';
import ScrollToTop from './components/Landing/ScrollToTop';
import StatsCards from './components/Landing/StatsCards';
import UseCasesSection from './components/Landing/UseCasesSection';
import PricingSection from './components/Landing/PricingSection';
import PlatformFeaturesSection from './components/Landing/PlatformFeaturesSection';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import ScenarioPicker from './components/Dashboard/ScenarioPicker';
import RealAWSConnect from './components/Dashboard/RealAWSConnect';
import TimelineView from './components/Analysis/TimelineView';
import AttackPathDiagram from './components/Visualizations/AttackPathDiagram';
import AttackPathReactFlow from './components/Visualizations/AttackPathReactFlow';
import VisualAnalysisUpload from './components/Analysis/VisualAnalysisUpload';
import RemediationPlan from './components/Analysis/RemediationPlan';
import DocumentationDisplay from './components/Analysis/DocumentationDisplay';
import ComplianceMapping from './components/Analysis/ComplianceMapping';
import CostImpact from './components/Analysis/CostImpact';
import SecurityPostureDashboard from './components/Analysis/SecurityPostureDashboard';
import ReportExport from './components/Analysis/ReportExport';
import { demoAPI, orchestrationAPI, visualAPI, documentationAPI, authAPI, incidentHistoryAPI, healthCheck } from './services/api';
import type { AnalysisResponse, DemoScenario, OrchestrationResponse } from './types/incident';
import { formatAnalysisTime, formatLastAnalyzed } from './utils/formatting';
import { hasAwsServicePrincipalInTimeline } from './utils/awsServiceDetection';
import { demoAnalysisData } from './data/demoAnalysis';
import { getQuickDemoResult } from './data/quickDemoResult';
import { DEFAULT_DEMO_SCENARIOS } from './data/demoScenarios';
import AgentProgress from './components/Analysis/AgentProgress';
import VoiceAssistant from './components/Analysis/VoiceAssistant';
import IncidentHistory from './components/Dashboard/IncidentHistory';
import AIPipelineSecurity from './components/Dashboard/AIPipelineSecurity';
import AISecurityGraph from './components/Dashboard/AISecurityGraph';
import AICompliance from './components/Dashboard/AICompliance';
import DemoChecklist from './components/Dashboard/DemoChecklist';
import AgenticQuery from './components/Analysis/AgenticQuery';
import ChangeSetAnalysis from './components/Analysis/ChangeSetAnalysis';
import ProtocolAdherence from './components/Analysis/ProtocolAdherence';
import LoginPage from './components/Auth/LoginPage';
import { LiveSimulation } from './components/Simulation/LiveSimulation';
import {
  SecurityHealthCheck,
  DEMO_HEALTH_CHECK,
  parseHealthCheckResult,
  type SecurityHealthCheckResult,
} from './components/Analysis/SecurityHealthCheck';

type AppMode = 'landing' | 'login' | 'demo' | 'console';

function App() {
  const [mode, setMode] = useState<AppMode>('landing');
  const [scenarios, setScenarios] = useState<DemoScenario[]>(DEFAULT_DEMO_SCENARIOS);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [orchestrationResult, setOrchestrationResult] = useState<OrchestrationResponse | null>(null);
  const [visualAnalysisResult, setVisualAnalysisResult] = useState<any>(null);
  const [remediationPlan, setRemediationPlan] = useState<any>(null);
  const [documentationResult, setDocumentationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [awsProfile, setAwsProfile] = useState<string>('default');
  const [awsConnected, setAwsConnected] = useState(false);
  const [awsAccountId, setAwsAccountId] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'profile' | 'sso'>('profile');
  const [ssoStartUrl, setSsoStartUrl] = useState('');
  const [ssoRegion, setSsoRegion] = useState('us-east-1');
  const [activeFeature, setActiveFeature] = useState('overview');
  const [useFullAI, setUseFullAI] = useState(false);
  const [backendOffline, setBackendOffline] = useState(() =>
    typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [incidentHistoryRefreshTrigger, setIncidentHistoryRefreshTrigger] = useState(0);
  const [visitedFeatures, setVisitedFeatures] = useState<Set<string>>(new Set());
  const [lastDemoScenarioId, setLastDemoScenarioId] = useState<string | null>(null);
  const [simulationScenarioId, setSimulationScenarioId] = useState<string | null>(null);
  const [healthCheckResult, setHealthCheckResult] = useState<SecurityHealthCheckResult | null>(null);
  const [healthCheckLoading, setHealthCheckLoading] = useState(false);
  const [resourcesDropdownOpen, setResourcesDropdownOpen] = useState(false);
  type LandingSection = 'home' | 'product' | 'features' | 'use-cases' | 'faq';
  const [landingSection, setLandingSection] = useState<LandingSection>('home');

  const getLandingSection = (h: string): LandingSection => {
    if (h === '#product') return 'product';
    if (h === '#features') return 'features';
    if (h === '#use-cases') return 'use-cases';
    if (h === '#faq') return 'faq';
    if (h === '#pricing') return 'home'; // pricing scrolls into view on home
    return 'home';
  };

  useEffect(() => {
    if (activeFeature) setVisitedFeatures((prev) => new Set(prev).add(activeFeature));
  }, [activeFeature]);

  useEffect(() => {
    loadScenarios();
    const updateFromHash = () => {
      const h = window.location.hash;
      if (h === '#demo') { setMode('demo'); return; }
      if (h === '#console') { setMode('console'); return; }
      if (h === '#login') { setMode('login'); return; }
      setMode('landing');
      setLandingSection(getLandingSection(h || ''));
    };
    updateFromHash();
    window.addEventListener('hashchange', updateFromHash);
    return () => window.removeEventListener('hashchange', updateFromHash);
  }, []);

  const loadScenarios = async () => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      setScenarios(DEFAULT_DEMO_SCENARIOS);
      return;
    }
    try {
      const data = await demoAPI.listScenarios();
      setScenarios(data.scenarios?.length ? data.scenarios : DEFAULT_DEMO_SCENARIOS);
      setBackendOffline(false);
    } catch {
      setScenarios(DEFAULT_DEMO_SCENARIOS);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) return;
    healthCheck().then((ok) => setBackendOffline(!ok));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) return;
    if (mode === 'demo' || mode === 'console') {
      healthCheck().then((ok) => setBackendOffline(!ok));
    }
  }, [mode]);

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setOrchestrationResult(null);
    setVisualAnalysisResult(null);
    setRemediationPlan(null);
    setDocumentationResult(null);
    setHealthCheckResult(null);
    setError(null);
    setActiveFeature('overview');
  };

  const handleHealthCheck = async () => {
    try {
      setHealthCheckLoading(true);
      setError(null);
      setHealthCheckResult(null);
      const backendOk = await healthCheck();
      if (backendOk) {
        const data = await orchestrationAPI.runSecurityHealthCheck(awsProfile, awsAccountId || undefined);
        const parsed = parseHealthCheckResult(data.results, data.account_id);
        setHealthCheckResult(parsed);
      } else {
        setHealthCheckResult(DEMO_HEALTH_CHECK);
      }
    } catch (err: any) {
      console.error('Health check error:', err);
      setHealthCheckResult(DEMO_HEALTH_CHECK);
      setError('Backend unreachable. Showing demo health report.');
    } finally {
      setHealthCheckLoading(false);
    }
  };

  const goBack = () => {
    setMode('landing');
    resetAnalysis();
    window.location.hash = '';
  };

  const handleSelectScenario = async (scenarioId: string) => {
    setLastDemoScenarioId(scenarioId);
    setLoading(true);
    setError(null);
    resetAnalysis();

    const useClientSideFallback = backendOffline || !useFullAI;

    try {
      let result;

      if (useClientSideFallback) {
        result = getQuickDemoResult(scenarioId);
      } else {
        let incidentType = 'Unknown';
        if (scenarioId === 'crypto-mining') incidentType = 'Cryptocurrency Mining Attack';
        else if (scenarioId === 'data-exfiltration') incidentType = 'Data Exfiltration';
        else if (scenarioId === 'privilege-escalation') incidentType = 'Privilege Escalation';
        else if (scenarioId === 'unauthorized-access') incidentType = 'Unauthorized Access';

        let events: any[] = [];
        if (scenarioId === 'crypto-mining') events = (await demoAPI.getCryptoMiningScenario()).events;
        else if (scenarioId === 'data-exfiltration') events = (await demoAPI.getDataExfiltrationScenario()).events;
        else if (scenarioId === 'privilege-escalation') events = (await demoAPI.getPrivilegeEscalationScenario()).events;
        else if (scenarioId === 'unauthorized-access') events = (await demoAPI.getUnauthorizedAccessScenario()).events;
        result = await orchestrationAPI.analyzeIncident(events, undefined, incidentType);
        setBackendOffline(false);
      }

      setOrchestrationResult(result);

      if (result.results.remediation_plan) {
        setRemediationPlan(result.results.remediation_plan);
      }

      if (result.results.timeline) {
        setAnalysisResult({
          incident_id: result.incident_id,
          timeline: result.results.timeline,
          analysis_time_ms: result.analysis_time_ms,
          model_used: useClientSideFallback ? 'Instant demo (client-side)' : 'Multi-Agent Orchestration (Nova 2 Lite, Nova Pro, Nova Micro)',
        });
      } else {
        setAnalysisResult(demoAnalysisData);
      }
    } catch (err: any) {
      console.error('Orchestration error:', err);
      const fallback = getQuickDemoResult(scenarioId);
      setOrchestrationResult(fallback);
      setRemediationPlan(fallback.results.remediation_plan);
      setAnalysisResult({
        incident_id: fallback.incident_id,
        timeline: fallback.results.timeline ?? demoAnalysisData.timeline,
        analysis_time_ms: fallback.analysis_time_ms,
        model_used: 'Instant demo (fallback)',
      });
      setError(err.message || 'Backend unreachable. Showing instant demo.');
    } finally {
      setLoading(false);
      setIncidentHistoryRefreshTrigger((t) => t + 1);
    }
  };

  const handleRealAWSAnalysis = async (daysBack: number, maxEvents: number) => {
    try {
      setLoading(true);
      setError(null);
      resetAnalysis();

      // Single backend call: fetch CloudTrail + run orchestration (no double analysis)
      const result = await orchestrationAPI.analyzeFromCloudTrail(
        daysBack,
        maxEvents,
        awsProfile,
        awsAccountId || undefined
      );

      if ((result as any).status === 'no_events') {
        const msg = (result as any).message || `No security events found in the last ${daysBack} days.`;
        setError(msg);
        setLoading(false);
        return;
      }

      setOrchestrationResult(result);

      if (result.results?.remediation_plan) {
        setRemediationPlan(result.results.remediation_plan);
      }

      const tl = result.results?.timeline;
      const eventsCount = (result as any).events_analyzed ?? tl?.events?.length ?? 0;
      const derivedIncidentType =
        result.metadata?.incident_type ||
        tl?.attack_pattern ||
        tl?.root_cause ||
        `Real AWS (last ${daysBack} days)`;

      setAnalysisResult({
        incident_id: result.incident_id,
        timeline: tl,
        analysis_time_ms: result.analysis_time_ms || 0,
        model_used: 'Multi-Agent Orchestration (Real AWS)',
        incident_type: derivedIncidentType,
        events_analyzed: eventsCount,
        time_range_days: daysBack,
      } as any);
    } catch (err: any) {
      console.error('Real AWS analysis error:', err);
      setError('Failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
      setIncidentHistoryRefreshTrigger((t) => t + 1);
    }
  };

  // ========== RENDER FEATURE CONTENT ==========
  const renderFeatureContent = () => {
    // Health check loading
    if (healthCheckLoading) {
      return (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Running Security Health Check</h3>
                  <p className="text-xs text-slate-500">5 Autonomous Agent queries: IAM, CloudTrail, Billing, Security Hub</p>
                </div>
              </div>
              <div className="space-y-2">
                {['IAM users audit', 'IAM roles audit', 'CloudTrail anomalies', 'CloudWatch billing', 'Security Hub'].map((label, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100"
                  >
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    // Health check result (proactive audit — no incident)
    if (healthCheckResult) {
      return (
        <SecurityHealthCheck
          result={healthCheckResult}
          onNewCheck={() => { setHealthCheckResult(null); }}
          demoMode={backendOffline}
        />
      );
    }

    // Loading state (incident analysis)
    if (loading) {
      const agents = [
        { name: 'Detect', model: 'Nova Pro', Icon: Eye, delay: 0 },
        { name: 'Investigate', model: 'Nova 2 Lite', Icon: Brain, delay: 1 },
        { name: 'Classify', model: 'Nova Micro', Icon: Zap, delay: 2 },
        { name: 'Remediate', model: 'Orchestrator', Icon: Shield, delay: 3 },
        { name: 'Document', model: 'Nova 2 Lite', Icon: FileText, delay: 4 },
      ];

      return (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          >
            {/* Progress bar */}
            <div className="h-1 bg-slate-100 overflow-hidden">
              <motion.div
                className="h-full bg-indigo-500"
                animate={{ width: ['0%', '100%'] }}
                transition={{ duration: 25, ease: 'easeInOut' }}
              />
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="w-5 h-5 text-indigo-600" />
                </motion.div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Running Multi-Agent Pipeline</h3>
                  <p className="text-xs text-slate-500">5 Nova AI models analyzing your incident</p>
                </div>
              </div>

              {/* Agent Steps */}
              <div className="space-y-2">
                {agents.map((agent, i) => (
                  <motion.div
                    key={agent.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <motion.div
                      className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center"
                      animate={i < 2 ? { backgroundColor: ['#e0e7ff', '#c7d2fe', '#e0e7ff'] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <agent.Icon className="w-4 h-4 text-indigo-600" />
                    </motion.div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-900">{agent.name}</p>
                      <p className="text-[10px] text-slate-400">{agent.model}</p>
                    </div>
                    <div className="w-24">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-indigo-500 rounded-full"
                          animate={{ width: ['0%', '100%'] }}
                          transition={{ duration: 6 + i * 2, delay: i * 1.5, ease: 'easeInOut' }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <p className="text-center text-[10px] text-slate-400 mt-4">
                {useFullAI ? 'Estimated time: ~30 seconds (full Nova AI)' : 'Instant demo: ~2 seconds'}
              </p>
            </div>
          </motion.div>
          {orchestrationResult && <AgentProgress agents={orchestrationResult.agents} />}
        </div>
      );
    }

    // Standalone tools — no incident analysis required
    if (activeFeature === 'changeset') {
      return <ChangeSetAnalysis backendOffline={backendOffline} />;
    }

    // No analysis yet — show scenario picker or AWS connect
    if (!analysisResult) {
      if (mode === 'demo') {
        return (
          <ScenarioPicker
            scenarios={scenarios}
            onSelectScenario={handleSelectScenario}
            onStartSimulation={(id) => setSimulationScenarioId(id)}
            loading={loading}
            useFullAI={useFullAI}
            onUseFullAIChange={setUseFullAI}
          />
        );
      }
      if (mode === 'console') {
        return (
          <div className="space-y-6">
            {/* Connection Card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 mb-0.5">Connect Your AWS Account</h2>
                <p className="text-sm text-slate-500">
                  Credentials stay local — <span className="font-semibold text-slate-700">never stored</span> on our servers.
                </p>
              </div>

              {/* Auth Method Tabs */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setAuthMethod('profile')}
                  className={`flex-1 px-4 py-3 text-xs font-bold text-center transition-colors relative ${
                    authMethod === 'profile'
                      ? 'text-indigo-700 bg-indigo-50/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  AWS CLI Profile
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">Recommended</span>
                  {authMethod === 'profile' && (
                    <motion.div layoutId="authTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                  )}
                </button>
                <button
                  onClick={() => setAuthMethod('sso')}
                  className={`flex-1 px-4 py-3 text-xs font-bold text-center transition-colors relative ${
                    authMethod === 'sso'
                      ? 'text-indigo-700 bg-indigo-50/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  AWS IAM Identity Center
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">SSO</span>
                  {authMethod === 'sso' && (
                    <motion.div layoutId="authTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                  )}
                </button>
              </div>

              {/* Auth Forms */}
              <div className="p-5">
                {authMethod === 'profile' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Profile Name</label>
                      <input
                        type="text"
                        value={awsProfile}
                        onChange={(e) => setAwsProfile(e.target.value)}
                        placeholder="default"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Uses AWS CLI profile (from <code className="bg-slate-100 px-1 rounded text-[10px]">aws login</code> or config).
                        <span className="block mt-0.5">Profile Name = section in <code className="bg-slate-100 px-1 rounded text-[10px]">~/.aws/config</code>. Use &quot;default&quot; for your main AWS account.</span>
                      </p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 mb-1 font-mono">Recommended — aws login (CLI 2.32.0+)</p>
                      <code className="text-sm text-green-400 font-mono block">
                        {awsProfile === 'default' ? 'aws login' : `aws login --profile ${awsProfile}`}
                      </code>
                      <p className="text-[10px] text-slate-500 mt-2">Alternative: <code className="text-slate-400">aws configure --profile {awsProfile}</code></p>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                      <Shield className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-indigo-600 leading-relaxed">
                        <strong>aws login:</strong> Browser-based OAuth. No keys on disk. Temporary credentials auto-refresh. Zero-trust — nothing transmitted or stored on any server.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3">
                      <p className="text-xs font-semibold text-emerald-800 mb-2">SSO works today via AWS profiles</p>
                      <p className="text-xs text-emerald-700 leading-relaxed mb-3">
                        Security teams in AWS Organizations: configure your SSO profile once, then select it in the <strong>CLI Profile</strong> tab above. No separate SSO flow needed.
                      </p>
                      <ol className="text-xs text-emerald-800 space-y-1.5 list-decimal list-inside font-medium">
                        <li>Run <code className="bg-emerald-100 px-1 rounded text-[10px]">aws configure sso</code> — enter your org&apos;s SSO start URL when prompted</li>
                        <li>Run <code className="bg-emerald-100 px-1 rounded text-[10px]">aws sso login</code> (or <code className="bg-emerald-100 px-1 rounded text-[10px]">aws login</code>)</li>
                        <li>Switch to the <strong>CLI Profile</strong> tab above</li>
                        <li>Select your SSO profile from the dropdown — you&apos;re connected</li>
                      </ol>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Your org&apos;s SSO Start URL</label>
                      <input
                        type="text"
                        value={ssoStartUrl}
                        onChange={(e) => setSsoStartUrl(e.target.value)}
                        placeholder="https://my-org.awsapps.com/start"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Used to generate the setup command below</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">SSO Region</label>
                      <select
                        value={ssoRegion}
                        onChange={(e) => setSsoRegion(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      >
                        <option value="us-east-1">US East (N. Virginia)</option>
                        <option value="us-west-2">US West (Oregon)</option>
                        <option value="eu-west-1">EU (Ireland)</option>
                        <option value="eu-central-1">EU (Frankfurt)</option>
                        <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                        <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                      </select>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 mb-1 font-mono">Run this to configure your SSO profile</p>
                      <code className="text-xs text-green-400 font-mono block break-all">
                        aws configure sso --profile nova-sentinel{ssoStartUrl ? ` --sso-start-url ${ssoStartUrl} --sso-region ${ssoRegion}` : ''}
                      </code>
                      <p className="text-[10px] text-slate-500 mt-2">Then: <code className="text-slate-400">aws sso login --profile nova-sentinel</code></p>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                      <Shield className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-indigo-600 leading-relaxed">
                        <strong>Multi-account:</strong> Create one profile per account. Switch profiles in the CLI Profile tab to analyze different accounts.
                      </p>
                    </div>
                  </div>
                )}

                {/* Test Connection */}
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={async () => {
                        setConnectionLoading(true);
                        setConnectionError(null);
                        try {
                          const result = await authAPI.testConnection(awsProfile);
                          setAwsConnected(result.connected);
                          setAwsAccountId(result.account_id || null);
                          if (result.connected) setConnectionError(null);
                          else setConnectionError('Connection failed. Check credentials and backend.');
                        } catch (err: any) {
                          setAwsConnected(false);
                          const msg = err?.response?.data?.detail || err?.message;
                          setConnectionError(
                            err?.response
                              ? `Connection test failed: ${msg || 'Check backend logs.'}`
                              : 'Backend unreachable. Start backend: cd backend && uvicorn main:app --reload'
                          );
                        } finally {
                          setConnectionLoading(false);
                        }
                      }}
                      disabled={connectionLoading || authMethod === 'sso'}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                    >
                    {connectionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing...
                      </>
                    ) : authMethod === 'sso' ? (
                      <>
                        <span className="text-xs">Switch to CLI Profile tab → select your SSO profile → Test Connection</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Test Connection
                      </>
                    )}
                  </button>
                  {awsConnected && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-700">Connected</span>
                    </div>
                  )}
                  </div>
                  {connectionError && (
                    <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                      {connectionError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Analysis Trigger — Health Check + CloudTrail */}
            <RealAWSConnect
              onAnalyze={handleRealAWSAnalysis}
              onHealthCheck={handleHealthCheck}
              loading={loading}
              healthCheckLoading={healthCheckLoading}
            />
          </div>
        );
      }
      return null;
    }

    // ========== Analysis results — render by active feature ==========
    switch (activeFeature) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Incident Header */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-slate-50/80">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-indigo-600" strokeWidth={1.8} />
                  </div>
                  <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-bold text-slate-900">
                      Incident {analysisResult.incident_id}
                    </h2>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-600" />
                      <span className="text-xs font-bold text-slate-700">
                        {(analysisResult.timeline.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">
                    Analyzed in <span className="font-semibold text-slate-700">{formatAnalysisTime(analysisResult.analysis_time_ms)}</span>
                    <span className="text-slate-400 mx-1">·</span>
                    Last analyzed: <span className="font-medium text-slate-600">{formatLastAnalyzed(analysisResult.timeline)}                    </span>
                  </p>
                  </div>
                </div>
                <button
                  onClick={resetAnalysis}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                >
                  New Analysis
                </button>
              </div>
              {orchestrationResult && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {orchestrationResult.results.risk_scores && (
                    <span className="text-[10px] px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200 font-semibold">
                      {orchestrationResult.results.risk_scores.length} Risk Scores
                    </span>
                  )}
                  {orchestrationResult.results.remediation_plan && (
                    <span className="text-[10px] px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 font-semibold">
                      Remediation Ready
                    </span>
                  )}
                </div>
              )}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" strokeWidth={1.8} />
              <div>
                <p className="text-xs font-bold text-slate-700">Analysis disclaimer</p>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                  This analysis assumes potential malicious activity. Legitimate admin or account owner usage may be flagged as suspicious. Always validate findings manually before treating them as confirmed breaches.
                </p>
              </div>
            </div>

            {/* Agent Progress */}
            {orchestrationResult && <AgentProgress agents={orchestrationResult.agents} />}

            {/* Agentic CTA — guide judges to Autonomous Agent tab */}
            {orchestrationResult && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-xs text-indigo-800">
                  The pipeline ran 4 agents in sequence. Want to see the agent think for itself?
                </p>
                <button
                  onClick={() => setActiveFeature('agentic-query')}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 rounded-lg transition-colors"
                >
                  Try the Autonomous Agent tab
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Agent Pivot — visible conditional reasoning (hackathon differentiator) */}
            {orchestrationResult?.metadata?.agent_pivot && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 flex items-start gap-3">
                <Zap className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" strokeWidth={1.8} />
                <div>
                  <p className="text-xs font-bold text-violet-800">Agent pivot</p>
                  <p className="text-[11px] text-violet-700 leading-relaxed mt-0.5">
                    {orchestrationResult.metadata.agent_pivot}
                  </p>
                </div>
              </div>
            )}

            {/* Low event count warning — dynamic for real AWS */}
            {typeof (analysisResult as any)?.events_analyzed === 'number' && (analysisResult as any).events_analyzed <= 5 && typeof (analysisResult as any)?.time_range_days === 'number' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-3">
                <Eye className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" strokeWidth={1.8} />
                <div>
                  <p className="text-xs font-semibold text-slate-700">Limited event data</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                    Analysis is based on {(analysisResult as any).events_analyzed} events from the last {(analysisResult as any).time_range_days} days. Findings may not reflect full account activity. Consider increasing time range or max events for broader coverage.
                  </p>
                </div>
              </div>
            )}

            {/* AWS service principal — likely low suspicion */}
            {hasAwsServicePrincipalInTimeline(analysisResult.timeline) && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3 flex items-start gap-3">
                <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" strokeWidth={1.8} />
                <div>
                  <p className="text-xs font-semibold text-slate-700">AWS service activity detected</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                    One or more actors appear to be AWS service principals (*.amazonaws.com). This is often benign automated activity (e.g. Resource Explorer, Config). Verify with your AWS service configuration before treating as malicious.
                  </p>
                </div>
              </div>
            )}

            {/* Security Posture Dashboard */}
            <SecurityPostureDashboard
              timeline={analysisResult.timeline}
              orchestrationResult={orchestrationResult}
              analysisTime={analysisResult.analysis_time_ms}
              incidentId={analysisResult.incident_id}
              onNavigateToCostImpact={() => setActiveFeature('cost')}
              onNavigateToTimeline={() => setActiveFeature('timeline')}
            />
          </div>
        );

      case 'timeline':
        return <TimelineView timeline={analysisResult.timeline} />;

      case 'incident-history':
        return (
          <IncidentHistory
            accountId={mode === 'console' && awsAccountId ? awsAccountId : 'demo-account'}
            refreshTrigger={incidentHistoryRefreshTrigger}
            backendOffline={backendOffline}
            onSelectIncident={async (id) => {
              if (id === orchestrationResult?.incident_id) {
                setActiveFeature('overview');
                return;
              }
              const acctId = mode === 'console' && awsAccountId ? awsAccountId : 'demo-account';
              try {
                setLoading(true);
                setError(null);
                const inc = await incidentHistoryAPI.getIncident(id, acctId);
                const minimalTimeline = {
                  events: [],
                  root_cause: inc.summary || inc.attack_type || 'Security incident',
                  attack_pattern: inc.attack_type || 'Unknown',
                  blast_radius: (Array.isArray(inc.affected_resources) && inc.affected_resources.length ? `${inc.affected_resources.length} resources` : 'Unknown'),
                  confidence: 0.7,
                };
                setAnalysisResult({
                  incident_id: inc.incident_id,
                  timeline: minimalTimeline,
                  analysis_time_ms: 0,
                  model_used: 'Incident History (summary only)',
                });
                setOrchestrationResult({
                  incident_id: inc.incident_id,
                  status: 'completed',
                  analysis_time_ms: 0,
                  agents: {},
                  results: { timeline: minimalTimeline },
                  metadata: { incident_type: inc.attack_type },
                });
                setRemediationPlan(null);
                setActiveFeature('overview');
              } catch {
                setError('Could not load incident details. It may have been analyzed in a previous session.');
              } finally {
                setLoading(false);
              }
            }}
            onRunDemoClick={() => { setMode('demo'); window.location.hash = '#demo'; }}
          />
        );

      case 'attack-path': {
        const useNarrative = mode === 'demo' || !!orchestrationResult?.metadata?.quick_demo;
        const isAIScenario = /shadow ai|llm|bedrock|prompt injection/i.test(orchestrationResult?.metadata?.incident_type || '');
        if (useNarrative) {
          return (
            <AttackPathReactFlow
              variant={isAIScenario ? 'ai' : 'standard'}
              onNavigateToRemediation={() => setActiveFeature('remediation')}
            />
          );
        }
        return (
          <AttackPathDiagram
            timeline={analysisResult.timeline}
            orchestrationResult={orchestrationResult}
            onNavigateToRemediation={() => setActiveFeature('remediation')}
            useNarrativeDemoGraph={false}
            eventsAnalyzed={(analysisResult as any)?.events_analyzed}
            timeRangeDays={(analysisResult as any)?.time_range_days}
          />
        );
      }

      case 'compliance':
        return (
          <ComplianceMapping
            timeline={analysisResult.timeline}
            incidentType={orchestrationResult?.metadata?.incident_type}
          />
        );

      case 'cost':
        return (
          <CostImpact
            timeline={analysisResult.timeline}
            incidentType={
              orchestrationResult?.metadata?.incident_type ||
              orchestrationResult?.results?.timeline?.attack_pattern ||
              (analysisResult as any)?.incident_type
            }
            eventsAnalyzed={(analysisResult as any)?.events_analyzed}
            timeRangeDays={(analysisResult as any)?.time_range_days}
            hasAwsServicePrincipal={hasAwsServicePrincipalInTimeline(analysisResult.timeline)}
          />
        );

      case 'protocol':
        return analysisResult ? (
          <ProtocolAdherence
            timeline={analysisResult.timeline}
            remediationPlan={remediationPlan || orchestrationResult?.results?.remediation_plan}
            documentation={documentationResult || orchestrationResult?.results?.documentation}
            backendOffline={backendOffline}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Run an analysis to see IR protocol adherence.</p>
          </div>
        );

      case 'remediation':
        return remediationPlan ? (
          <RemediationPlan
            plan={remediationPlan}
            incidentId={orchestrationResult?.incident_id || analysisResult?.incident_id}
            incidentType={orchestrationResult?.metadata?.incident_type || analysisResult?.timeline?.attack_pattern || 'Security Incident'}
            rootCause={analysisResult?.timeline?.root_cause || orchestrationResult?.results?.timeline?.root_cause || 'Unknown'}
            onNavigateToFeature={setActiveFeature}
            affectedResources={(() => {
              const tl = analysisResult?.timeline || orchestrationResult?.results?.timeline;
              const blast = tl?.blast_radius;
              const events = tl?.events || [];
              const resources = new Set<string>();
              events.forEach((e: any) => {
                if (e?.resource?.ARN) resources.add(e.resource.ARN);
                if (e?.requestParameters?.roleName) resources.add(`arn:aws:iam::*:role/${e.requestParameters.roleName}`);
              });
              return blast ? [blast] : Array.from(resources).slice(0, 5);
            })()}
            demoMode={mode === 'demo'}
            onApprove={async () => {
              try {
                setLoading(true);
                setError(null);
                if (orchestrationResult?.incident_id && orchestrationResult.results.timeline) {
                  const tl = orchestrationResult.results.timeline;
                  const docResult = await documentationAPI.generateDocumentation(
                    orchestrationResult.incident_id,
                    { severity: 'CRITICAL', ...tl } as any,
                    tl,
                    remediationPlan || orchestrationResult.results.remediation_plan
                  );
                  setDocumentationResult(docResult);
                  setOrchestrationResult(prev => prev ? {
                    ...prev,
                    agents: { ...prev.agents, documentation: { status: 'COMPLETED' } },
                    results: { ...prev.results, documentation: docResult }
                  } : null);
                  setActiveFeature('documentation');
                }
              } catch {
                // Backend offline — DocumentationDisplay shows client-generated docs
              } finally {
                setLoading(false);
              }
            }}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Remediation plan not yet generated.</p>
          </div>
        );

      case 'agentic-query':
        return <AgenticQuery backendOffline={backendOffline} />;

      case 'visual':
        return (
          <VisualAnalysisUpload
            timeline={analysisResult?.timeline}
            orchestrationResult={orchestrationResult}
            onNavigateToRemediation={() => setActiveFeature('remediation')}
            onUpload={async (file) => {
              try {
                setLoading(true);
                setError(null);
                if (orchestrationResult?.incident_id) {
                  const result = await orchestrationAPI.analyzeIncident(
                    orchestrationResult.results.timeline?.events || [],
                    file,
                    orchestrationResult.metadata?.incident_type
                  );
                  setOrchestrationResult(result);
                  setVisualAnalysisResult(result.results.visual);
                } else {
                  const result = await visualAPI.analyzeDiagram(file);
                  setVisualAnalysisResult(result);
                }
              } catch (err: any) {
                setError('Visual analysis error: ' + (err.response?.data?.detail || err.message));
              } finally {
                setLoading(false);
              }
            }}
            analysisResult={visualAnalysisResult}
            loading={loading}
          />
        );

      case 'aria':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            {/* Header — matches other tabs */}
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50/40">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Mic className="w-4.5 h-4.5 text-white" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Aria — Voice Security Assistant</h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    Powered by Amazon Nova 2 Lite
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200 text-[10px] font-medium">
                      <Volume2 className="w-3 h-3" /> Voice + Text
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* How to use */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <MessageSquare className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" strokeWidth={1.8} />
                <div>
                  <p className="text-sm font-bold text-slate-800">How to use Aria</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Click the chat icon in the bottom-right corner to open Aria. Ask questions by voice or text — she explains findings, recommends actions, and walks you through results.
                  </p>
                  <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-700 font-medium">
                    <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                    Aria is active — look for the chat button below
                  </div>
                </div>
              </div>

              {/* Before analysis */}
              {!analysisResult && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Run a demo scenario or connect your AWS account first. Once analysis is complete, Aria can walk you through the incident, explain the attack path, recommend remediation, and answer questions about compliance and cost.
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 'documentation':
        return analysisResult ? (
          <DocumentationDisplay
            documentation={(documentationResult || orchestrationResult?.results?.documentation)?.documentation || (documentationResult || orchestrationResult?.results?.documentation)}
            incidentId={orchestrationResult?.incident_id || analysisResult?.incident_id || 'Unknown'}
            timeline={analysisResult.timeline}
            remediationPlan={remediationPlan || orchestrationResult?.results?.remediation_plan}
            onGenerateDocumentation={async () => {
              try {
                setLoading(true);
                setError(null);
                const incId = orchestrationResult?.incident_id || analysisResult?.incident_id;
                const tl = analysisResult?.timeline || orchestrationResult?.results?.timeline;
                const remPlan = remediationPlan || orchestrationResult?.results?.remediation_plan;
                if (!incId || !tl) return;
                const docResult = await documentationAPI.generateDocumentation(
                  incId,
                  { severity: 'CRITICAL', ...tl } as any,
                  tl,
                  remPlan
                );
                setDocumentationResult(docResult);
                if (orchestrationResult) {
                  setOrchestrationResult(prev => prev ? {
                    ...prev,
                    agents: { ...prev.agents, documentation: { status: 'COMPLETED' } },
                    results: { ...prev.results, documentation: docResult }
                  } : null);
                }
              } catch {
                // Backend offline — DocumentationDisplay shows client-generated docs
              } finally {
                setLoading(false);
              }
            }}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Run a demo scenario or AWS analysis first.</p>
            <button
              onClick={() => setActiveFeature('overview')}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Go to Demo Scenarios →
            </button>
          </div>
        );

      case 'ai-pipeline':
        return <AIPipelineSecurity onNavigateToFeature={setActiveFeature} />;

      case 'security-graph':
        return <AISecurityGraph />;

      case 'ai-compliance':
        return <AICompliance />;

      case 'export':
        return analysisResult ? (
          <ReportExport
            timeline={analysisResult.timeline}
            orchestrationResult={orchestrationResult}
            incidentId={analysisResult.incident_id}
            analysisTime={analysisResult.analysis_time_ms}
            remediationPlan={remediationPlan}
            incidentType={orchestrationResult?.metadata?.incident_type || 'Security Incident'}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Run a demo scenario or AWS analysis first.</p>
          </div>
        );

      default:
        return null;
    }
  };

  const handleSimulationComplete = () => {
    const id = simulationScenarioId;
    setSimulationScenarioId(null);
    if (id) handleSelectScenario(id);
  };

  const handleLoginTryDemo = () => {
    setMode('demo');
    window.location.hash = '#demo';
  };

  const handleLoginConnectAWS = () => {
    setMode('console');
    window.location.hash = '#console';
  };

  const handleBackToHome = () => {
    setMode('landing');
    window.location.hash = '';
  };

  // ========== LOGIN PAGE (Premium gate) ==========
  if (mode === 'login') {
    return (
      <LoginPage
        onTryDemo={handleLoginTryDemo}
        onConnectAWS={handleLoginConnectAWS}
        onBackToHome={handleBackToHome}
      />
    );
  }

  // ========== DEMO or CONSOLE MODE ==========
  if (mode === 'demo' || mode === 'console') {
    return (
      <>
        {simulationScenarioId && (
          <LiveSimulation
            scenarioId={simulationScenarioId}
            onComplete={handleSimulationComplete}
            onSkip={handleSimulationComplete}
          />
        )}
        {!simulationScenarioId && (
        <DashboardLayout
          mode={mode}
          activeFeature={activeFeature}
          onFeatureChange={setActiveFeature}
          onBack={goBack}
          onBackToScenarios={mode === 'demo' ? resetAnalysis : undefined}
          hasAnalysis={!!analysisResult}
          awsAccountId={awsAccountId}
          headerRight={
            <div className="flex items-center gap-3">
              {mode === 'console' && awsAccountId && (
                <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <span className="text-[10px] font-medium text-indigo-600 uppercase tracking-wider">AWS</span>
                  <span className="ml-1.5 text-xs font-mono font-bold text-indigo-800">{awsAccountId}</span>
                </div>
              )}
              {mode === 'demo' && analysisResult && (
                <DemoChecklist
                  runScenarioDone={!!orchestrationResult}
                  visitedFeatures={visitedFeatures}
                  activeFeature={activeFeature}
                  onNavigate={setActiveFeature}
                />
              )}
              {analysisResult && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-700">Analysis Complete</span>
                </div>
              )}
              {loading && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
                  <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />
                  <span className="text-xs font-bold text-slate-700">Analyzing...</span>
                </div>
              )}
            </div>
          }
        >
          {/* Backend offline (subtle) */}
          {backendOffline && !error && (
            <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 mb-4 flex items-center gap-2">
              <span className="text-xs text-slate-600">
                Demo mode — backend offline. Instant demo works. For full AI, start backend: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">cd backend && uvicorn main:app --reload</code>
              </span>
            </div>
          )}
          {/* Prominent fallback banner — when useFullAI was ON but backend offline, user sees demo data */}
          {mode === 'demo' && analysisResult?.model_used === 'Instant demo (fallback)' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500 border-2 border-amber-600 rounded-xl px-4 py-3 flex items-center gap-3 mb-4 shadow-lg"
            >
              <AlertCircle className="h-6 w-6 text-amber-900 flex-shrink-0" strokeWidth={2.5} />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-950">
                  You are viewing demo data — backend was unreachable for full AI analysis
                </p>
                <p className="text-xs text-amber-900/90 mt-0.5">
                  Start the backend for real Nova AI: <code className="bg-amber-600/30 px-1.5 py-0.5 rounded font-mono text-[11px]">cd backend && uvicorn main:app --reload</code>
                </p>
              </div>
            </motion.div>
          )}

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start justify-between gap-3 mb-6"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-900">Error</h4>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {lastDemoScenarioId && mode === 'demo' && (
                  <button
                    onClick={() => { setError(null); handleSelectScenario(lastDemoScenarioId); }}
                    className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" /> Retry
                  </button>
                )}
                <button
                  onClick={() => { setActiveFeature('overview'); setError(null); }}
                  className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                >
                  Back to Overview
                </button>
                <button
                  onClick={() => setError(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}

          {/* Feature Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature + (loading ? '-loading' : '')}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {renderFeatureContent()}
            </motion.div>
          </AnimatePresence>
        </DashboardLayout>
        )}

        {/* Voice Assistant — hidden during simulation */}
        {!simulationScenarioId && (
        <VoiceAssistant
          incidentContext={orchestrationResult?.results ? {
            timeline: orchestrationResult.results.timeline,
            remediation_plan: orchestrationResult.results.remediation_plan,
            risk_scores: orchestrationResult.results.risk_scores,
            correlation: orchestrationResult.results.correlation,
            incident_id: orchestrationResult.incident_id,
            incident_type: orchestrationResult.metadata?.incident_type,
          } : undefined}
          incidentId={orchestrationResult?.incident_id || analysisResult?.incident_id}
          isAnalysisComplete={!!analysisResult && !loading}
        />
        )}
      </>
    );
  }

  // ========== LANDING PAGE ==========
  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Navigation — light */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.dispatchEvent(new HashChangeEvent('hashchange')); }} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                <NovaSentinelLogo size={30} animated={false} />
                <span className="text-base font-bold text-slate-900">Nova Sentinel</span>
              </a>
              {landingSection !== 'home' && (
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.dispatchEvent(new HashChangeEvent('hashchange')); }}
                  className="hidden sm:inline-flex items-center gap-1.5 ml-4 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Home
                </a>
              )}
            </div>

            <div className="hidden md:flex items-center gap-6">
              <a href="#product" className={`text-sm font-medium transition-colors ${landingSection === 'product' ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}>Product</a>
              <a href="#features" className={`text-sm font-medium transition-colors ${landingSection === 'features' ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}>Features</a>
              <a href="#use-cases" className={`text-sm font-medium transition-colors ${landingSection === 'use-cases' ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}>Use Cases</a>
              <div className="relative">
                <button
                  onClick={() => setResourcesDropdownOpen(!resourcesDropdownOpen)}
                  onBlur={() => setTimeout(() => setResourcesDropdownOpen(false), 150)}
                  className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Resources
                  <ChevronDown className={`w-4 h-4 transition-transform ${resourcesDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {resourcesDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-52 py-2 bg-white rounded-xl border border-slate-200 shadow-lg z-50">
                    <a href="#faq" onClick={() => setResourcesDropdownOpen(false)} className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">FAQ</a>
                    <a href="https://github.com/bhavikam28/nova-sentinel#readme" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">Docs</a>
                    <a href="https://github.com/bhavikam28/nova-sentinel" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">GitHub</a>
                  </div>
                )}
              </div>
              <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">Pricing</a>
              <a href="#login" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Sign In
              </a>
              <a
                href="#login"
                className="btn-nova px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors"
              >
                Get Started
              </a>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-600 hover:text-slate-900"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-200 bg-white"
            >
              <div className="px-4 py-6 space-y-4">
                {landingSection !== 'home' && (
                  <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; setMobileMenuOpen(false); window.dispatchEvent(new HashChangeEvent('hashchange')); }} className="flex items-center gap-2 text-indigo-600 font-medium">
                    <Home className="w-4 h-4" />
                    Back to Home
                  </a>
                )}
                <a href="#product" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 hover:text-slate-900 font-medium">Product</a>
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 hover:text-slate-900 font-medium">Features</a>
                <a href="#use-cases" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 hover:text-slate-900 font-medium">Use Cases</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 hover:text-slate-900 font-medium">FAQ</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 hover:text-slate-900 font-medium">Pricing</a>
                <a href="https://github.com/bhavikam28/nova-sentinel" target="_blank" rel="noopener noreferrer" className="block text-slate-600 hover:text-slate-900 font-medium">GitHub</a>
                <a href="#login" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 hover:text-slate-900 font-medium">
                  Sign In
                </a>
                <a
                  href="#login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full btn-nova px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold text-center"
                >
                  Get Started
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <LandingHero />

      {/* Content — home = full landing with key visuals; sub-pages = detailed content */}
      {landingSection === 'home' && (
        <>
          <StatsCards />
          {/* Key visuals ON landing: Pipeline, Attack Path, MCP, Dashboard */}
          <FeaturesSection />
          {/* Quick links to deeper content */}
          <div className="py-10 bg-slate-50/50 border-y border-slate-200">
            <div className="max-w-4xl mx-auto px-4 text-center">
              <p className="text-sm text-slate-600 mb-4">Explore more</p>
              <div className="flex flex-wrap justify-center gap-3">
                <a href="#product" className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:border-indigo-200 hover:bg-indigo-50/50 transition-all">Product</a>
                <a href="#features" className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:border-indigo-200 hover:bg-indigo-50/50 transition-all">Features</a>
                <a href="#use-cases" className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:border-indigo-200 hover:bg-indigo-50/50 transition-all">Use Cases</a>
                <a href="#faq" className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:border-indigo-200 hover:bg-indigo-50/50 transition-all">FAQ</a>
              </div>
            </div>
          </div>
        </>
      )}

      {landingSection === 'product' && (
        <div id="product">
          <div className="pt-4 pb-2 flex justify-center">
            <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.dispatchEvent(new HashChangeEvent('hashchange')); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </a>
          </div>
          <PlatformFeaturesSection />
        </div>
      )}

      {landingSection === 'features' && (
        <div id="features">
          <div className="pt-4 pb-2 flex justify-center">
            <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.dispatchEvent(new HashChangeEvent('hashchange')); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </a>
          </div>
          <FeaturesSection />
        </div>
      )}

      {landingSection === 'use-cases' && (
        <div id="use-cases">
          <div className="pt-4 pb-2 flex justify-center">
            <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.dispatchEvent(new HashChangeEvent('hashchange')); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </a>
          </div>
          <UseCasesSection />
        </div>
      )}

      {landingSection === 'faq' && (
        <div id="faq">
          <div className="pt-4 pb-2 flex justify-center">
            <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.dispatchEvent(new HashChangeEvent('hashchange')); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </a>
          </div>
          <FAQSection />
        </div>
      )}

      {/* Home-only: Pricing + CTA */}
      {landingSection === 'home' && (
        <>
          <PricingSection />

      {/* CTA — premium */}
      <section className="py-28 bg-gradient-to-b from-slate-50 to-white border-t border-slate-200 relative overflow-hidden" id="cta">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(99,102,241,0.06) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(139,92,246,0.06) 0%, transparent 50%)',
        }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              Try the Agentic Pipeline
            </h2>
            <p className="text-lg text-slate-600 mb-12 max-w-2xl mx-auto">
              Demo scenarios or connect your AWS account. From signal to resolution — credentials stay local.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <button
                onClick={() => { setMode('demo'); window.location.hash = '#demo'; }}
                className="px-10 py-4 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center gap-3 justify-center shadow-sm"
              >
                <Play className="h-5 w-5 text-indigo-500" />
                Try Demo
              </button>
              <button
                onClick={() => { setMode('console'); window.location.hash = '#console'; }}
                className="btn-nova inline-flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:bg-indigo-700 transition-all"
              >
                <Shield className="h-5 w-5" />
                Launch Console
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <FAQSection />
        </>
      )}

      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2.5 mb-4">
              <NovaSentinelLogo size={28} animated={false} />
              <span className="text-base font-bold text-slate-900">Nova Sentinel</span>
            </div>
            <p className="text-sm text-slate-500 text-center mb-4 max-w-xl">
              Multi-agent orchestration, CloudTrail analysis, MITRE ATLAS, Bedrock Guardrails, threat intel, compliance mapping, and automated remediation — powered by 5 Nova models and 5 AWS MCP servers.
            </p>
            <div className="flex gap-4 text-xs text-slate-500">
              <span>#AmazonNova</span>
              <span>·</span>
              <span>#NovaSentinel</span>
              <span>·</span>
              <span>© 2026</span>
            </div>
          </div>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}

export default App;
