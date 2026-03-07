/**
 * FAQ Section — Aegis-style premium design
 * White cards, subtle shadows, Q: icon, clear hierarchy
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2, DollarSign } from 'lucide-react';

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: 'What is Nova Sentinel?',
      a: 'Nova Sentinel is an agentic incident response pipeline powered by Amazon Nova. It orchestrates 5 specialized AI models to go from security alert to remediation plan to documentation — autonomously, with human-in-the-loop approval for risky actions.',
    },
    {
      q: 'What will this cost me?',
      a: 'Demo mode is 100% free — no AWS account needed, no charges. For real AWS analysis, you pay only for your own AWS Bedrock usage (~$0.01–0.10 per incident). Credentials stay local; we never store or transmit them.',
      badges: [
        { icon: CheckCircle2, text: 'Demo mode: 100% free, no AWS account needed', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
        { icon: DollarSign, text: 'Real AWS: You pay only for Bedrock usage (~$0.01–0.10/incident)', color: 'bg-slate-100 border-slate-200 text-slate-700' },
      ],
    },
    {
      q: 'Is it safe to use my AWS credentials?',
      a: 'Yes. Credentials stay on your machine. We use your local AWS CLI profile or AWS SSO — no keys on disk. Nothing is transmitted or stored on our servers. You can audit our code on GitHub.',
    },
    {
      q: 'What does "agentic" mean?',
      a: 'Agentic means multiple AI models work together with shared state. Nova Sentinel uses 5 Nova models: Detect, Investigate, Classify, Remediate, Document. Each does what it\'s best at, passing context through the pipeline — no manual triage.',
    },
    {
      q: 'How fast is the analysis?',
      a: 'Risk classification runs in under 1 second (Nova Micro). Full orchestration — timeline, attack path, remediation plan, documentation — completes in one pipeline run. Time varies with event volume; demo scenarios are optimized for quick exploration.',
    },
  ];

  return (
    <section className="py-20 bg-slate-50/80 border-y border-slate-200/80" id="faq">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-slate-600 text-sm">
            Quick answers for security teams and evaluators
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full px-6 py-5 flex items-start gap-4 text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-sm">Q</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-900">{item.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 ml-2 inline-block align-middle transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-0 pl-[4.5rem]">
                        <p className="text-slate-600 text-sm leading-relaxed mb-3">
                          {item.a}
                        </p>
                        {item.badges && (
                          <div className="flex flex-wrap gap-2">
                            {item.badges.map((badge, j) => {
                              const Icon = badge.icon;
                              return (
                                <span
                                  key={j}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${badge.color}`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  {badge.text}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
