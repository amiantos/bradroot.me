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

export async function fetchDiscourseTopics() {
  try {
    const res = await fetch('https://discuss.bradroot.me/latest.json', {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      console.error(`Discourse topics API error: ${res.status}`);
      return [];
    }
    const data = await res.json();
    const topics = (data.topic_list?.topics || [])
      .slice(0, 6)
      .map(t => ({
        title: t.title,
        slug: t.slug,
        id: t.id,
        last_posted_at: t.last_posted_at,
        last_posted_at_formatted: new Date(t.last_posted_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric',
        }),
      }));
    console.log(`Fetched ${topics.length} Discourse topics`);
    return topics;
  } catch (err) {
    console.error('Discourse topics fetch failed:', err.message);
    return [];
  }
}

function decodeHTMLEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseRSSItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = (itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1]?.trim() || '';
    const link = (itemXml.match(/<link>([\s\S]*?)<\/link>/) || [])[1]?.trim() || '';
    const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]?.trim() || '';
    items.push({ title: decodeHTMLEntities(title), link, pubDate });
  }
  return items;
}

export async function fetchStairesRSS() {
  try {
    const res = await fetch('https://staires.org/rss.xml');
    if (!res.ok) {
      console.error(`staires.org RSS error: ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const items = parseRSSItems(xml).slice(0, 3);

    // Try to extract YouTube video ID from description CDATA
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let i = 0;
    while ((match = itemRegex.exec(xml)) !== null && i < 3) {
      const desc = match[1];
      const ytMatch = desc.match(/youtube\.com\/embed\/([A-Za-z0-9_-]+)/);
      if (ytMatch && items[i]) {
        items[i].youtubeId = ytMatch[1];
      }
      i++;
    }

    // Format dates
    for (const item of items) {
      if (item.pubDate) {
        item.pubDate_formatted = new Date(item.pubDate).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric',
        });
      }
    }

    console.log(`Fetched ${items.length} staires.org songs`);
    return items;
  } catch (err) {
    console.error('staires.org RSS fetch failed:', err.message);
    return [];
  }
}

export async function fetchFloatedRSS() {
  try {
    const res = await fetch('https://ihavebeenfloated.org/rss.xml');
    if (!res.ok) {
      console.error(`ihavebeenfloated.org RSS error: ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const items = parseRSSItems(xml).slice(0, 3);

    for (const item of items) {
      if (item.pubDate) {
        item.pubDate_formatted = new Date(item.pubDate).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric',
        });
      }
    }

    console.log(`Fetched ${items.length} ihavebeenfloated.org posts`);
    return items;
  } catch (err) {
    console.error('ihavebeenfloated.org RSS fetch failed:', err.message);
    return [];
  }
}

export async function fetchAmiantosRSS() {
  try {
    const res = await fetch('https://amiantos.net/feed/index.xml');
    if (!res.ok) {
      console.error(`amiantos.net RSS error: ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const items = parseRSSItems(xml).slice(0, 3);

    for (const item of items) {
      if (item.pubDate) {
        item.pubDate_formatted = new Date(item.pubDate).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric',
        });
      }
    }

    console.log(`Fetched ${items.length} amiantos.net posts`);
    return items;
  } catch (err) {
    console.error('amiantos.net RSS fetch failed:', err.message);
    return [];
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
    return { games: [] };
  }
}

export async function fetchAllData() {
  console.log('Fetching all data...');
  const [repos, discourse, discourseTopics, aihorde, stairesSongs, floatedPosts, amiantosPosts] = await Promise.all([
    fetchGitHubRepos('amiantos'),
    fetchDiscourseStats(),
    fetchDiscourseTopics(),
    fetchAIHordeStats(),
    fetchStairesRSS(),
    fetchFloatedRSS(),
    fetchAmiantosRSS(),
  ]);

  return { repos, discourse, discourseTopics, aihorde, stairesSongs, floatedPosts, amiantosPosts };
}

// Run directly for testing
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = await fetchAllData();
  console.log(JSON.stringify(data, null, 2));
}
