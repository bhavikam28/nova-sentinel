/**
 * Compact Features teaser — CTA only, no repetitive pipeline diagram
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const FeaturesTeaser: React.FC = () => {
  return (
    <section className="py-16 relative overflow-hidden" id="features-teaser" style={{ background: '#050c1a' }}>
      {/* Floating dashboards background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: 'url(/images/features-bg.png)', opacity: 0.20 }}
      />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(5,12,26,0.5) 0%, rgba(5,12,26,0.7) 100%)' }} />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-slate-400 text-sm mb-4">
            Attack path, MCP servers, compliance mapping, remediation engine
          </p>
          <a
            href="#features"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = '#features';
              window.dispatchEvent(new HashChangeEvent('hashchange'));
            }}
            className="inline-flex items-center gap-2 text-indigo-400 font-semibold text-sm hover:text-indigo-300 transition-colors"
          >
            Explore full pipeline
            <ChevronRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesTeaser;
