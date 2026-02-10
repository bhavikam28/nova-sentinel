/**
 * Nova Sentinel - Autonomous Security Intelligence Platform
 * Premium UI with clearly named features and tabbed analysis
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, AlertCircle, CheckCircle2, Menu, X, 
  ArrowLeft, Clock, ChevronRight,
  Loader2, Sparkles, Eye, Brain, Zap, Shield, FileText
} from 'lucide-react';
import NovaSentinelLogo from './components/Logo';
import LandingHero from './components/Landing/LandingHero';
import FeaturesSection from './components/Landing/FeaturesSection';
import TimelineView from './components/Analysis/TimelineView';
import InsightCards from './components/Analysis/InsightCards';
import FeatureShowcase from './components/Dashboard/FeatureShowcase';
import AWSAuthTab from './components/Dashboard/AWSAuthTab';
import RealAWSConnect from './components/Dashboard/RealAWSConnect';
import AttackPathDiagram from './components/Visualizations/AttackPathDiagram';
import VisualAnalysisUpload from './components/Analysis/VisualAnalysisUpload';
import RemediationPlan from './components/Analysis/RemediationPlan';
import DocumentationDisplay from './components/Analysis/DocumentationDisplay';
import ComplianceMapping from './components/Analysis/ComplianceMapping';
import CostImpact from './components/Analysis/CostImpact';
import FeatureTabsNav from './components/Analysis/FeatureTabs';
import SecurityPostureDashboard from './components/Analysis/SecurityPostureDashboard';
import ReportExport from './components/Analysis/ReportExport';
import { analysisAPI, demoAPI, orchestrationAPI, visualAPI, documentationAPI, authAPI } from './services/api';
import type { AnalysisResponse, DemoScenario, OrchestrationResponse } from './types/incident';
import { formatAnalysisTime } from './utils/formatting';
import { demoAnalysisData } from './data/demoAnalysis';
import AgentProgress from './components/Analysis/AgentProgress';
import VoiceAssistant from './components/Analysis/VoiceAssistant';

function App() {
  const [showDemo, setShowDemo] = useState(false);
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [orchestrationResult, setOrchestrationResult] = useState<OrchestrationResponse | null>(null);
  const [visualAnalysisResult, setVisualAnalysisResult] = useState<any>(null);
  const [remediationPlan, setRemediationPlan] = useState<any>(null);
  const [documentationResult, setDocumentationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [awsProfile, setAwsProfile] = useState<string>('secops-lens');
  const [awsConnected, setAwsConnected] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState('overview');

  useEffect(() => {
    loadScenarios();
    if (window.location.hash === '#demo') {
      setShowDemo(true);
    }
    const handleHashChange = () => {
      if (window.location.hash === '#demo') {
        setShowDemo(true);
      } else if (!window.location.hash || window.location.hash === '') {
        setShowDemo(false);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const loadScenarios = async () => {
    try {
      const data = await demoAPI.listScenarios();
      setScenarios(data.scenarios);
    } catch (err) {
      console.error('Failed to load scenarios:', err);
      setError('Unable to connect to backend. Please ensure the backend server is running on port 8000.');
    }
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setOrchestrationResult(null);
    setVisualAnalysisResult(null);
    setRemediationPlan(null);
    setDocumentationResult(null);
    setError(null);
    setActiveResultTab('overview');
  };

  const handleSelectScenario = async (scenarioId: string) => {
    setLoading(true);
    setError(null);
    resetAnalysis();
    setShowDemo(true);

    try {
      let events: any[] = [];
      let incidentType = 'Unknown';
      
      if (scenarioId === 'crypto-mining') {
        const scenario = await demoAPI.getCryptoMiningScenario();
        events = scenario.events;
        incidentType = 'Cryptocurrency Mining Attack';
      } else if (scenarioId === 'data-exfiltration') {
        const scenario = await demoAPI.getDataExfiltrationScenario();
        events = scenario.events;
        incidentType = 'Data Exfiltration';
      } else if (scenarioId === 'privilege-escalation') {
        const scenario = await demoAPI.getPrivilegeEscalationScenario();
        events = scenario.events;
        incidentType = 'Privilege Escalation';
      } else if (scenarioId === 'unauthorized-access') {
        const scenario = await demoAPI.getUnauthorizedAccessScenario();
        events = scenario.events;
        incidentType = 'Unauthorized Access';
      }

      const result = await orchestrationAPI.analyzeIncident(events, undefined, incidentType);
      setOrchestrationResult(result);

      if (result.results.remediation_plan) {
        setRemediationPlan(result.results.remediation_plan);
      }

      if (result.results.timeline) {
        setAnalysisResult({
          incident_id: result.incident_id,
          timeline: result.results.timeline,
          analysis_time_ms: result.analysis_time_ms,
          model_used: 'Multi-Agent Orchestration (Nova 2 Lite, Nova Pro, Nova Micro)',
        });
      } else {
        console.warn('Orchestration result missing timeline, using demo data');
        setAnalysisResult(demoAnalysisData);
      }
    } catch (err: any) {
      console.error('Orchestration error:', err);
      console.log('Falling back to demo data due to error');
      setAnalysisResult(demoAnalysisData);
      setError(err.message || 'Failed to run orchestrated analysis. Using demo data.');
    } finally {
      setLoading(false);
    }
  };

  // Render the active result tab content
  const renderResultTabContent = () => {
    if (!analysisResult) return null;

    switch (activeResultTab) {
      case 'overview':
        return (
          <SecurityPostureDashboard
            timeline={analysisResult.timeline}
            orchestrationResult={orchestrationResult}
            analysisTime={analysisResult.analysis_time_ms}
            incidentId={analysisResult.incident_id}
          />
        );

      case 'timeline':
        return <TimelineView timeline={analysisResult.timeline} />;

      case 'attack-path':
        return (
          <div className="space-y-6">
            <AttackPathDiagram />
            <VisualAnalysisUpload
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
                  console.error('Visual analysis error:', err);
                  setError('Failed to analyze diagram: ' + (err.response?.data?.detail || err.message));
                } finally {
                  setLoading(false);
                }
              }}
              analysisResult={visualAnalysisResult}
              loading={loading}
            />
          </div>
        );

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
            incidentType={orchestrationResult?.metadata?.incident_type}
          />
        );

      case 'remediation':
        return remediationPlan ? (
          <RemediationPlan
            plan={remediationPlan}
            onApprove={async () => {
              try {
                setLoading(true);
                setError(null);
                if (orchestrationResult?.incident_id && orchestrationResult.results.timeline && remediationPlan) {
                  const docResult = await documentationAPI.generateDocumentation(
                    orchestrationResult.incident_id,
                    orchestrationResult.results.timeline,
                    remediationPlan
                  );
                  setDocumentationResult(docResult);
                  setOrchestrationResult(prev => prev ? {
                    ...prev,
                    agents: { ...prev.agents, documentation: { status: 'COMPLETED' } },
                    results: { ...prev.results, documentation: docResult }
                  } : null);
                }
              } catch (err: any) {
                console.error('Documentation error:', err);
                setError('Failed to generate documentation: ' + (err.response?.data?.detail || err.message));
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

      case 'documentation':
        return (documentationResult || orchestrationResult?.results?.documentation) ? (
          <DocumentationDisplay
            documentation={(documentationResult || orchestrationResult?.results?.documentation)?.documentation || (documentationResult || orchestrationResult?.results?.documentation)}
            incidentId={orchestrationResult?.incident_id || analysisResult?.incident_id || 'Unknown'}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Approve remediation plan first to generate documentation.</p>
          </div>
        );

      case 'export':
        return (
          <ReportExport
            timeline={analysisResult.timeline}
            orchestrationResult={orchestrationResult}
            incidentId={analysisResult.incident_id}
            analysisTime={analysisResult.analysis_time_ms}
            remediationPlan={remediationPlan}
          />
        );

      default:
        return null;
    }
  };

  // ========== DEMO/ANALYSIS VIEW ==========
  if (showDemo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20">
        {/* Premium Dashboard Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setShowDemo(false);
                    resetAnalysis();
                    window.location.hash = '';
                  }}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </button>
                <div className="w-px h-6 bg-slate-200" />
                <div className="flex items-center gap-2.5">
                  <NovaSentinelLogo size={28} animated={false} />
                  <div>
                    <h1 className="text-sm font-bold text-slate-900 leading-tight">Nova Sentinel</h1>
                    <p className="text-[10px] text-slate-400 font-medium">Security Intelligence</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {analysisResult && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-700">Analysis Complete</span>
                  </div>
                )}
                {loading && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />
                    <span className="text-xs font-bold text-indigo-700">Analyzing...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            
            {/* ========== PRE-ANALYSIS: Feature Showcase ========== */}
            {!analysisResult && !loading && (
              <>
                {scenarios.length > 0 ? (
                  <FeatureShowcase
                    scenarios={scenarios}
                    onSelectScenario={handleSelectScenario}
                    onConnectAWS={() => {}}
                    loading={loading}
                    awsTab={
                      <div className="space-y-4">
                        <AWSAuthTab
                          onAuthMethodSelected={(method) => {
                            if (method === 'profile') setAwsProfile('secops-lens');
                          }}
                          currentMethod={awsProfile ? 'profile' : undefined}
                          onTestConnection={async () => {
                            try {
                              const result = await authAPI.testConnection(awsProfile);
                              setAwsConnected(result.connected);
                              return result.connected;
                            } catch (err) {
                              setAwsConnected(false);
                              return false;
                            }
                          }}
                          loading={loading}
                        />
                        {awsConnected && (
                          <RealAWSConnect
                            onAnalyze={async (daysBack, maxEvents) => {
                              try {
                                setLoading(true);
                                setError(null);
                                resetAnalysis();

                                const realAnalysis = await analysisAPI.analyzeRealCloudTrail(daysBack, maxEvents, awsProfile);
                                
                                if ((realAnalysis as any).status === 'no_events') {
                                  setError(`No security events found in the last ${daysBack} days. Try increasing the time range.`);
                                  setLoading(false);
                                  return;
                                }

                                const events = realAnalysis.timeline?.events || [];
                                const cloudtrailEvents = events.map((e: any) => ({
                                  eventTime: typeof e.timestamp === 'string' ? e.timestamp : e.timestamp.toISOString(),
                                  eventName: e.action || 'Unknown',
                                  userIdentity: { userName: e.actor || 'Unknown', type: 'IAMUser' },
                                  requestParameters: { resource: e.resource || 'Unknown' },
                                  sourceIPAddress: e.details?.sourceIP || 'Unknown',
                                  awsRegion: 'us-east-1'
                                }));

                                const result = await orchestrationAPI.analyzeIncident(cloudtrailEvents, undefined, 'Real AWS Account Analysis');
                                setOrchestrationResult(result);
                                setAnalysisResult({
                                  incident_id: result.incident_id,
                                  timeline: result.results.timeline || realAnalysis.timeline,
                                  analysis_time_ms: result.analysis_time_ms || realAnalysis.analysis_time_ms,
                                  model_used: 'Multi-Agent Orchestration (Real AWS)',
                                });
                              } catch (err: any) {
                                console.error('Real AWS analysis error:', err);
                                setError('Failed to analyze: ' + (err.response?.data?.detail || err.message));
                              } finally {
                                setLoading(false);
                              }
                            }}
                            loading={loading}
                          />
                        )}
                      </div>
                    }
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Connecting to Backend...</h3>
                    <p className="text-sm text-slate-500">Ensure the backend is running on port 8000.</p>
                    {error && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Error Banner */}
            {error && (analysisResult || loading) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-900">Error</h4>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </motion.div>
            )}

            {/* ========== LOADING STATE ========== */}
            {loading && (
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200 shadow-elevated overflow-hidden"
                >
                  <div className="h-1 bg-slate-100 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      style={{ width: '50%' }}
                    />
                  </div>

                  <div className="p-8 lg:p-10">
                    <div className="text-center mb-8">
                      <div className="relative inline-flex items-center justify-center mb-4">
                        <motion.div
                          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Sparkles className="w-8 h-8 text-white" />
                        </motion.div>
                        <motion.div
                          className="absolute -inset-3 rounded-2xl border-2 border-indigo-300"
                          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2">
                        Multi-Agent Analysis in Progress
                      </h3>
                      <p className="text-sm text-slate-500 max-w-md mx-auto">
                        5 Nova AI models working together to detect, analyze, classify, and remediate
                      </p>
                    </div>

                    <div className="grid grid-cols-5 gap-3 mb-8">
                      {[
                        { name: 'Detect', model: 'Nova Pro', Icon: Eye, color: 'from-blue-500 to-cyan-500', delay: 0 },
                        { name: 'Investigate', model: 'Nova 2 Lite', Icon: Brain, color: 'from-purple-500 to-violet-500', delay: 3 },
                        { name: 'Classify', model: 'Nova Micro', Icon: Zap, color: 'from-amber-500 to-orange-500', delay: 6 },
                        { name: 'Remediate', model: 'Orchestrator', Icon: Shield, color: 'from-emerald-500 to-teal-500', delay: 9 },
                        { name: 'Document', model: 'Nova 2 Lite', Icon: FileText, color: 'from-violet-500 to-purple-500', delay: 12 },
                      ].map((agent, i) => (
                        <motion.div
                          key={agent.name}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.15 }}
                          className="relative"
                        >
                          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center h-full">
                            <motion.div
                              className={`w-10 h-10 rounded-lg bg-gradient-to-br ${agent.color} mx-auto mb-2 flex items-center justify-center shadow-sm`}
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: agent.delay * 0.1 }}
                            >
                              <agent.Icon className="w-5 h-5 text-white" />
                            </motion.div>
                            <p className="text-xs font-bold text-slate-900">{agent.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{agent.model}</p>
                            <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full bg-gradient-to-r ${agent.color} rounded-full`}
                                animate={{ width: ['0%', '100%'] }}
                                transition={{ duration: 8, delay: agent.delay * 0.3, ease: 'easeInOut' }}
                              />
                            </div>
                          </div>
                          {i < 4 && (
                            <motion.div
                              className="absolute top-1/2 -right-2.5 z-10 text-slate-300"
                              animate={{ x: [0, 3, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </motion.div>
                          )}
                        </motion.div>
                      ))}
                    </div>

                    <div className="bg-white/70 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="w-2.5 h-2.5 rounded-full bg-indigo-500"
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                          <span className="text-sm font-medium text-slate-700">
                            Analyzing CloudTrail events and building attack timeline...
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>~30 seconds</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                {orchestrationResult && <AgentProgress agents={orchestrationResult.agents} />}
              </div>
            )}

            {/* ========== ANALYSIS RESULTS WITH FEATURE TABS ========== */}
            {analysisResult && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-5"
              >
                {/* Agent Progress Summary */}
                {orchestrationResult && <AgentProgress agents={orchestrationResult.agents} />}

                {/* Incident Header Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-xl font-bold text-slate-900">
                            Incident {analysisResult.incident_id}
                          </h2>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700">
                              {(analysisResult.timeline.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500">
                          Analyzed in <span className="font-semibold text-slate-700">{formatAnalysisTime(analysisResult.analysis_time_ms)}</span> using {analysisResult.model_used}
                        </p>
                      </div>
                      <button
                        onClick={() => { resetAnalysis(); }}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                      >
                        New Analysis
                      </button>
                    </div>

                    {orchestrationResult && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {orchestrationResult.results.risk_scores && (
                          <span className="text-[10px] px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 font-bold">
                            {orchestrationResult.results.risk_scores.length} Risk Scores
                          </span>
                        )}
                        {orchestrationResult.results.remediation_plan && (
                          <span className="text-[10px] px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 font-bold">
                            Remediation Ready
                          </span>
                        )}
                        {orchestrationResult.results.visual && (
                          <span className="text-[10px] px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 font-bold">
                            Visual Analysis
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Insight Cards (always visible) */}
                <InsightCards timeline={analysisResult.timeline} />

                {/* Feature Tabs Navigation */}
                <FeatureTabsNav
                  activeTab={activeResultTab}
                  onTabChange={setActiveResultTab}
                />

                {/* Active Tab Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeResultTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderResultTabContent()}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}

            {/* Empty State */}
            {!analysisResult && !loading && !error && scenarios.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
                <Play className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Select a Feature to Begin</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Expand "Threat Detection Pipeline" above and choose a demo scenario, or connect your real AWS account.
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/50 bg-white/50 backdrop-blur-sm mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-xs text-slate-400">
              Nova Sentinel — Built with Amazon Nova for the Amazon Nova AI Hackathon 2026
            </p>
            <div className="flex justify-center gap-4 mt-2 text-[10px] text-slate-300">
              <span>Nova 2 Lite</span>
              <span>·</span>
              <span>Nova Pro</span>
              <span>·</span>
              <span>Nova Micro</span>
              <span>·</span>
              <span>Nova 2 Sonic</span>
              <span>·</span>
              <span>MCP Server</span>
              <span>·</span>
              <span>Strands Agents</span>
            </div>
          </div>
        </footer>

        {/* Nova Sonic Voice Assistant - Floating */}
        <VoiceAssistant
          incidentContext={orchestrationResult?.results ? {
            timeline: orchestrationResult.results.timeline,
            remediation_plan: orchestrationResult.results.remediation_plan,
          } : undefined}
          incidentId={orchestrationResult?.incident_id || analysisResult?.incident_id}
          isAnalysisComplete={!!analysisResult && !loading}
        />
      </div>
    );
  }

  // ========== LANDING PAGE ==========
  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <NovaSentinelLogo size={30} animated={false} />
              <span className="text-base font-bold text-slate-900">Nova Sentinel</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">Features</a>
              <a href="#demo" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">Demo</a>
              <button
                onClick={() => { setShowDemo(true); window.location.hash = '#demo'; }}
                className="btn-nova px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm"
              >
                Try Live Demo
              </button>
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
                <a href="#features" className="block text-slate-700 font-medium">Features</a>
                <a href="#demo" className="block text-slate-700 font-medium">Demo</a>
                <button
                  onClick={() => { setShowDemo(true); window.location.hash = '#demo'; }}
                  className="w-full btn-nova px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  Try Live Demo
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero */}
      <LandingHero />

      {/* Features */}
      <FeaturesSection />

      {/* CTA Section */}
      <section className="py-24 bg-slate-50 border-t border-slate-200" id="demo">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-6 tracking-tight">
              Ready to Secure Your Cloud?
            </h2>
            <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
              See Nova Sentinel resolve critical security incidents 
              in under 60 seconds with autonomous AI agents.
            </p>
            <button
              onClick={() => { setShowDemo(true); window.location.hash = '#demo'; }}
              className="btn-nova inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg"
            >
              <Play className="h-6 w-6" />
              Launch Interactive Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2.5 mb-4">
              <NovaSentinelLogo size={28} animated={false} />
              <span className="text-base font-bold text-slate-900">Nova Sentinel</span>
            </div>
            <p className="text-sm text-slate-500 text-center mb-4">
              Built with Amazon Nova for the Amazon Nova AI Hackathon 2026
            </p>
            <div className="flex gap-4 text-xs text-slate-400">
              <span>#AmazonNova</span>
              <span>·</span>
              <span>#NovaSentinel</span>
              <span>·</span>
              <span>© 2026</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
