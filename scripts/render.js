import nunjucks from 'nunjucks';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_DIR = join(__dirname, 'templates');
const WEBSITE_DIR = join(__dirname, '..', 'website');
const DATA_DIR = join(__dirname, 'data');

// Configure Nunjucks
const env = nunjucks.configure(TEMPLATES_DIR, {
  autoescape: true,
  trimBlocks: true,
  lstripBlocks: true,
});

env.addFilter('abbreviate', function (val) {
  if (val == null || val === '—') return val;
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  if (isNaN(num)) return val;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
});

function loadJSON(filepath) {
  try {
    return JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch {
    return null;
  }
}

export function render(siteData = {}) {
  const featuredProjects = loadJSON(join(DATA_DIR, 'featured-projects.json')) || [];
  const manualData = loadJSON(join(DATA_DIR, 'manual.json')) || { games: [] };

  // Merge star counts into featured projects if we have GitHub data
  const allRepos = siteData.repos || [];
  const featuredRepoNames = featuredProjects.map(p => p.repo.toLowerCase());

  for (const project of featuredProjects) {
    const repoData = allRepos.find(r => r.name.toLowerCase() === project.repo.toLowerCase());
    if (repoData) {
      project.stars = repoData.stargazers_count;
    }
  }

  // Filter other repos: exclude featured, exclude forks, exclude hidden, min 1 star
  const hiddenRepos = (manualData.hidden_repos || []).map(n => n.toLowerCase());
  const otherRepos = allRepos
    .filter(r => !r.fork)
    .filter(r => !featuredRepoNames.includes(r.name.toLowerCase()))
    .filter(r => !hiddenRepos.includes(r.name.toLowerCase()))
    .filter(r => r.stargazers_count >= 1)
    .sort((a, b) => b.stargazers_count - a.stargazers_count);

  // Recent repos (sorted by push date)
  const recentRepos = [...allRepos]
    .filter(r => !r.fork)
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, 6)
    .map(r => ({
      ...r,
      pushed_at_formatted: new Date(r.pushed_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles',
      }),
    }));

  // Scan ealain images and shuffle
  const ealainDir = join(WEBSITE_DIR, 'images', 'ealain');
  let ealainImages = [];
  try {
    ealainImages = readdirSync(ealainDir)
      .filter(f => /\.(webp|jpg|png)$/i.test(f))
      .map(f => `images/ealain/${f}`);
    for (let i = ealainImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ealainImages[i], ealainImages[j]] = [ealainImages[j], ealainImages[i]];
    }
  } catch {
    // No ealain images directory
  }

  const now = new Date();
  const templateData = {
    featured_projects: featuredProjects,
    other_repos: otherRepos,
    recent_repos: recentRepos,
    discourse: siteData.discourse || null,
    discourse_topics: siteData.discourseTopics || [],
    aihorde: siteData.aihorde || null,
    games: manualData.games || [],
    staires_songs: siteData.stairesSongs || [],
    floated_posts: siteData.floatedPosts || [],
    amiantos_posts: siteData.amiantosPosts || [],
    ealain_images: ealainImages,
    github_stats: {
      repos: allRepos.filter(r => !r.fork).length,
      stars: allRepos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0),
      forks: allRepos.reduce((sum, r) => sum + (r.forks_count || 0), 0),
    },
    year: now.getFullYear(),
    build_date: now.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles',
    }),
  };

  // Render index
  const indexHtml = env.render('index.njk', templateData);
  writeFileSync(join(WEBSITE_DIR, 'index.html'), indexHtml);

  // Render 404
  const notFoundHtml = env.render('404.njk', templateData);
  writeFileSync(join(WEBSITE_DIR, '404.html'), notFoundHtml);

  console.log('Rendered index.html and 404.html');
}

// Run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  render();
}
