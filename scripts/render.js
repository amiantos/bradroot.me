import nunjucks from 'nunjucks';
import { readFileSync, writeFileSync } from 'fs';
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

function loadJSON(filepath) {
  try {
    return JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch {
    return null;
  }
}

export function render(siteData = {}) {
  const featuredProjects = loadJSON(join(DATA_DIR, 'featured-projects.json')) || [];
  const manualData = loadJSON(join(DATA_DIR, 'manual.json')) || { games: [], music: [] };

  // Merge star counts into featured projects if we have GitHub data
  const allRepos = siteData.repos || [];
  const featuredRepoNames = featuredProjects.map(p => p.repo.toLowerCase());

  for (const project of featuredProjects) {
    const repoData = allRepos.find(r => r.name.toLowerCase() === project.repo.toLowerCase());
    if (repoData) {
      project.stars = repoData.stargazers_count;
    }
  }

  // Filter other repos: exclude featured, exclude forks, min 1 star
  const otherRepos = allRepos
    .filter(r => !r.fork)
    .filter(r => !featuredRepoNames.includes(r.name.toLowerCase()))
    .filter(r => r.stargazers_count >= 1)
    .sort((a, b) => b.stargazers_count - a.stargazers_count);

  // Recent repos (sorted by push date)
  const recentRepos = [...allRepos]
    .filter(r => !r.fork)
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, 8)
    .map(r => ({
      ...r,
      pushed_at_formatted: new Date(r.pushed_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      }),
    }));

  const now = new Date();
  const templateData = {
    featured_projects: featuredProjects,
    other_repos: otherRepos,
    recent_repos: recentRepos,
    starred_repos: siteData.starred || [],
    discourse: siteData.discourse || null,
    aihorde: siteData.aihorde || null,
    games: manualData.games || [],
    music: manualData.music || [],
    year: now.getFullYear(),
    build_date: now.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
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
