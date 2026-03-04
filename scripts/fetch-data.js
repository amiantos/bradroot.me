import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, 'data');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

function githubHeaders() {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  return headers;
}

export async function fetchGitHubRepos(username) {
  const repos = [];
  let page = 1;
  while (true) {
    const url = `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&type=owner`;
    const res = await fetch(url, { headers: githubHeaders() });
    if (!res.ok) {
      console.error(`GitHub repos API error: ${res.status}`);
      break;
    }
    const data = await res.json();
    if (data.length === 0) break;
    repos.push(...data);
    page++;
  }
  console.log(`Fetched ${repos.length} repos from GitHub`);
  return repos;
}

export async function fetchStarredRepos(username, count = 10) {
  const url = `https://api.github.com/users/${username}/starred?per_page=${count}&sort=created&direction=desc`;
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) {
    console.error(`GitHub starred API error: ${res.status}`);
    return [];
  }
  const data = await res.json();
  console.log(`Fetched ${data.length} starred repos`);
  return data;
}

export async function fetchDiscourseStats() {
  try {
    const res = await fetch('https://discuss.bradroot.me/about.json', {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      console.error(`Discourse API error: ${res.status}`);
      return null;
    }
    const data = await res.json();
    const stats = data.about?.stats;
    if (!stats) return null;
    return {
      topics: stats.topics_count,
      posts: stats.posts_count,
      users: stats.users_count,
    };
  } catch (err) {
    console.error('Discourse fetch failed:', err.message);
    return null;
  }
}

export async function fetchAIHordeStats() {
  try {
    const res = await fetch('https://aihorde.net/api/v2/styles/image/ec929308-bfcf-47b2-92c1-07abdfbc682f', {
      headers: {
        'Client-Agent': 'bradroot-me:1:bradroot@me.com',
      },
    });
    if (!res.ok) {
      console.error(`AI Horde API error: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return {
      images_generated: data.use_count?.toLocaleString() || null,
      kudos: data.shared_key?.utilized?.toLocaleString() || null,
    };
  } catch (err) {
    console.error('AI Horde fetch failed:', err.message);
    return null;
  }
}

export function loadManualData() {
  try {
    return JSON.parse(readFileSync(join(DATA_DIR, 'manual.json'), 'utf-8'));
  } catch {
    return { games: [], music: [] };
  }
}

export async function fetchAllData() {
  console.log('Fetching all data...');
  const [repos, starred, discourse, aihorde] = await Promise.all([
    fetchGitHubRepos('amiantos'),
    fetchStarredRepos('amiantos', 10),
    fetchDiscourseStats(),
    fetchAIHordeStats(),
  ]);

  return { repos, starred, discourse, aihorde };
}

// Run directly for testing
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = await fetchAllData();
  console.log(JSON.stringify(data, null, 2));
}
