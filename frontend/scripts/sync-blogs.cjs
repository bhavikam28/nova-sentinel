/**
 * Sync blog content from blogs/*.md to blogsData.ts
 * Run: node scripts/sync-blogs.cjs
 */
const fs = require('fs');
const path = require('path');

const blogsDir = path.join(__dirname, '../../blogs');
const outputPath = path.join(__dirname, '../src/data/blogsData.ts');

const BLOG_META = [
  { id: '01', file: '01-wolfir-project-overview.md', readTime: '8 min read', tags: ['Amazon Nova', 'Architecture', 'Security', 'AWS'], date: 'Mar 10, 2026' },
  { id: '02', file: '02-multi-agent-orchestration-challenges.md', readTime: '10 min read', tags: ['Strands Agents', 'Architecture', 'Engineering', 'Amazon Nova'], date: 'Mar 9, 2026' },
  { id: '03', file: '03-ai-pipeline-security-mitre-atlas.md', readTime: '9 min read', tags: ['MITRE ATLAS', 'AI Security', 'Security', 'Amazon Bedrock'], date: 'Mar 8, 2026' },
  { id: '04', file: '04-real-aws-vs-demo-mode.md', readTime: '8 min read', tags: ['Architecture', 'Engineering', 'AWS', 'Demo Mode'], date: 'Mar 7, 2026' },
  { id: '05', file: '05-remediation-nova-act-and-human-in-the-loop.md', readTime: '10 min read', tags: ['Remediation', 'Nova Act', 'Human-in-the-Loop', 'AWS Security'], date: 'Mar 6, 2026' },
];

function escapeForTemplateLiteral(str) {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function extractBlog(mdPath, meta) {
  const raw = fs.readFileSync(mdPath, 'utf8');
  const lines = raw.split('\n');
  let title = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# ')) {
      title = line.slice(2).trim();
      i++;
      break;
    }
    i++;
  }
  const rest = lines.slice(i).join('\n');
  const firstPara = rest.split(/\n\n+/)[0] || rest.slice(0, 200);
  const excerpt = firstPara
    .replace(/\n/g, ' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .trim()
    .slice(0, 200);
  const content = rest.trim();
  return { ...meta, title, excerpt, content };
}

const blogs = BLOG_META.map((meta) => {
  const mdPath = path.join(blogsDir, meta.file);
  return extractBlog(mdPath, meta);
});

const blogEntries = blogs.map((b) => {
  const contentEscaped = escapeForTemplateLiteral(b.content);
  const excerptEscaped = b.excerpt.replace(/'/g, "\\'");
  return `  {
    id: '${b.id}',
    title: '${b.title.replace(/'/g, "\\'")}',
    excerpt: '${excerptEscaped}',
    readTime: '${b.readTime}',
    tags: [${b.tags.map((t) => `'${t}'`).join(', ')}],
    author: 'Bhavika Mantri',
    date: '${b.date}',
    content: \`${contentEscaped}\`,
  }`;
});

const tsContent = `/**
 * Blog content for wolfir website — Medium-quality long-form posts.
 * Synced from blogs/*.md — backticks escaped for template literals.
 */
export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  readTime?: string;
  tags?: string[];
  image?: string;
  author?: string;
  date?: string;
}

export const BLOGS: BlogPost[] = [
${blogEntries.join(',\n')}
];
`;

fs.writeFileSync(outputPath, tsContent, 'utf8');
console.log('Synced', blogs.length, 'blogs to', outputPath);
