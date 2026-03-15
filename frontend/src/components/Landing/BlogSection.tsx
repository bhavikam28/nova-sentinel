/**
 * Blog Section — Premium full-page blog index
 */
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, Clock, ArrowRight, Tag } from 'lucide-react';
import { BLOGS } from '../../data/blogsData';

const BLOG_CATEGORIES = ['All', 'Architecture', 'Security', 'Amazon Nova', 'Engineering'];

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  'Amazon Nova': { bg: 'rgba(37,99,235,0.08)', text: '#2563EB' },
  'Architecture': { bg: 'rgba(124,58,237,0.08)', text: '#7C3AED' },
  'Security': { bg: 'rgba(220,38,38,0.08)', text: '#DC2626' },
  'AWS': { bg: 'rgba(245,158,11,0.08)', text: '#D97706' },
  'Engineering': { bg: 'rgba(5,150,105,0.08)', text: '#059669' },
  'Strands Agents': { bg: 'rgba(14,165,233,0.08)', text: '#0EA5E9' },
  'MITRE ATLAS': { bg: 'rgba(99,102,241,0.08)', text: '#6366F1' },
  'AI Security': { bg: 'rgba(99,102,241,0.08)', text: '#6366F1' },
  'Amazon Bedrock': { bg: 'rgba(249,115,22,0.08)', text: '#EA580C' },
  'Remediation': { bg: 'rgba(20,184,166,0.08)', text: '#0D9488' },
  'Nova Act': { bg: 'rgba(236,72,153,0.08)', text: '#BE185D' },
  'Human-in-the-Loop': { bg: 'rgba(71,85,105,0.08)', text: '#475569' },
  'Demo Mode': { bg: 'rgba(245,158,11,0.08)', text: '#D97706' },
};

const getTagStyle = (tag: string) =>
  TAG_COLORS[tag] ?? { bg: 'rgba(71,85,105,0.08)', text: '#475569' };

interface BlogSectionProps {
  onPostClick?: (postId: string) => void;
}

const BlogSection: React.FC<BlogSectionProps> = ({ onPostClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const handlePostClick = (postId: string) => {
    if (onPostClick) {
      onPostClick(postId);
    } else {
      window.location.hash = `#blog/${postId}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  const filteredBlogs = useMemo(() => {
    let list = BLOGS;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.excerpt.toLowerCase().includes(q) ||
          (b.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    if (activeCategory !== 'All') {
      list = list.filter((b) => (b.tags || []).some((t) => t.includes(activeCategory)));
    }
    return list;
  }, [searchQuery, activeCategory]);

  return (
    <section className="min-h-screen bg-white">
      {/* Blog header banner with image */}
      <div className="relative overflow-hidden py-24 pb-16" style={{ background: 'linear-gradient(135deg, #020817 0%, #080D1F 60%, #0D1B3E 100%)' }}>
        <div className="absolute inset-0 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: 'url(/images/blog-header.png)', opacity: 0.22 }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(2,8,23,0.70) 0%, rgba(8,13,31,0.55) 100%)' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-blue-400/80 mb-5 flex items-center justify-center gap-2">
              <span className="w-8 h-px bg-blue-500/50" />wolfir · Engineering Blog<span className="w-8 h-px bg-blue-500/50" />
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-5 leading-tight">
              Insights from wolfir
            </h1>
            <p className="text-lg text-white/60 max-w-xl mx-auto font-light">
              Architecture deep-dives, security research, and engineering stories.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-6"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search posts by title, topic, or tag…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors shadow-sm"
          />
        </motion.div>

        {/* Category filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap gap-2 mb-12"
        >
          {BLOG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
              style={
                activeCategory === cat
                  ? {
                      background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
                      color: 'white',
                      boxShadow: '0 2px 12px rgba(37,99,235,0.25)',
                    }
                  : {
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      color: '#475569',
                    }
              }
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Blog cards */}
        <div className="space-y-5">
          {filteredBlogs.map((blog, i) => (
            <motion.article
              key={blog.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
              onClick={() => handlePostClick(blog.id)}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Accent gradient bar */}
                <div
                  className="sm:w-1.5 sm:min-w-[6px] sm:h-auto h-1.5 flex-shrink-0"
                  style={{ background: 'linear-gradient(180deg, #2563EB, #6366F1)' }}
                />

                <div className="flex-1 p-6 sm:p-7 flex flex-col">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(blog.tags || []).slice(0, 4).map((tag) => {
                      const style = getTagStyle(tag);
                      return (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide"
                          style={{ background: style.bg, color: style.text }}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>

                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2 leading-snug">
                    {blog.title}
                  </h2>

                  <p className="text-sm text-slate-500 line-clamp-2 mb-5 flex-1 leading-relaxed">
                    {blog.excerpt}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      {blog.author && (
                        <span className="font-medium text-slate-600">{blog.author}</span>
                      )}
                      {blog.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {blog.date}
                        </span>
                      )}
                      {blog.readTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {blog.readTime}
                        </span>
                      )}
                    </div>
                    <span
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 group-hover:gap-2.5 transition-all duration-200"
                    >
                      Read more
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {filteredBlogs.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <Tag className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-700 mb-2">No posts match your search</p>
            <p className="text-sm text-slate-400 mb-6">Try a different keyword or browse all posts</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogSection;
