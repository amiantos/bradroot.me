import express from 'express';
import cron from 'node-cron';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import nunjucks from 'nunjucks';
import sharp from 'sharp';
import { build } from './build.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 5050;
const DATA_DIR = join(__dirname, 'data');
const MANUAL_FILE = join(DATA_DIR, 'manual.json');
const SITE_DATA_FILE = join(DATA_DIR, 'site_data.json');
const FEATURED_PROJECTS_FILE = join(DATA_DIR, 'featured-projects.json');
const TEMPLATES_DIR = join(__dirname, 'templates');
const GAMES_IMG_DIR = join(__dirname, '..', 'website', 'images', 'games');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configure Nunjucks for admin templates
nunjucks.configure(TEMPLATES_DIR, {
  autoescape: true,
  express: app,
});

// Ensure games image directory exists
if (!existsSync(GAMES_IMG_DIR)) {
  mkdirSync(GAMES_IMG_DIR, { recursive: true });
}

function loadManual() {
  try {
    if (existsSync(MANUAL_FILE)) {
      return JSON.parse(readFileSync(MANUAL_FILE, 'utf-8'));
    }
  } catch {}
  return { games: [] };
}

function saveManual(data) {
  writeFileSync(MANUAL_FILE, JSON.stringify(data, null, 2));
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function downloadGameImage(imageUrl, gameName) {
  const slug = slugify(gameName);
  // Always save as jpg for consistency
  const filename = `${slug}.jpg`;
  const localPath = `images/games/${filename}`;
  const fullPath = join(GAMES_IMG_DIR, filename);

  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      console.error(`Failed to download image for ${gameName}: ${res.status}`);
      return '';
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await sharp(buffer)
      .resize(800, 450, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toFile(fullPath);
    console.log(`Downloaded and resized image for ${gameName}`);
    return localPath;
  } catch (err) {
    console.error(`Image download failed for ${gameName}:`, err.message);
    return '';
  }
}

function loadJSON(filepath) {
  try {
    if (existsSync(filepath)) {
      return JSON.parse(readFileSync(filepath, 'utf-8'));
    }
  } catch {}
  return null;
}

function getEligibleRepos() {
  const siteData = loadJSON(SITE_DATA_FILE) || {};
  const featuredProjects = loadJSON(FEATURED_PROJECTS_FILE) || [];
  const allRepos = siteData.repos || [];
  const featuredRepoNames = featuredProjects.map(p => p.repo.toLowerCase());

  return allRepos
    .filter(r => !r.fork)
    .filter(r => !featuredRepoNames.includes(r.name.toLowerCase()))
    .filter(r => r.stargazers_count >= 1)
    .sort((a, b) => b.stargazers_count - a.stargazers_count);
}

// Admin UI
app.get('/', (req, res) => {
  const manual = loadManual();
  const eligibleRepos = getEligibleRepos();
  const hiddenRepos = manual.hidden_repos || [];
  res.render('admin.njk', {
    games: manual.games || [],
    eligible_repos: eligibleRepos,
    hidden_repos: hiddenRepos,
    message: req.query.message || null,
  });
});

// Save data
app.post('/save', async (req, res) => {
  const body = req.body;

  // Parse games from form arrays
  // express + qs with extended:true strips the [] from field names
  const gameNames = [].concat(body['game_name'] || body['game_name[]'] || []).filter(Boolean);
  const gameImageUrls = [].concat(body['game_image_url'] || body['game_image_url[]'] || []);
  const gameLinks = [].concat(body['game_link'] || body['game_link[]'] || []);
  const gameExistingImages = [].concat(body['game_existing_image'] || body['game_existing_image[]'] || []);

  const games = [];
  for (let i = 0; i < gameNames.length; i++) {
    const name = gameNames[i]?.trim();
    if (!name) continue;

    const imageUrl = gameImageUrls[i]?.trim() || '';
    const existingImage = gameExistingImages[i]?.trim() || '';
    const link = gameLinks[i]?.trim() || '';

    let image = existingImage;
    // If a new image URL was provided, download it
    if (imageUrl) {
      const downloaded = await downloadGameImage(imageUrl, name);
      if (downloaded) image = downloaded;
    }

    games.push({ name, image, link });
  }

  // Hidden repos
  const hidden_repos = [].concat(body['hidden_repos'] || body['hidden_repos[]'] || []).filter(Boolean);

  saveManual({ games, hidden_repos });
  res.redirect('/?message=Saved successfully');
});

// Trigger manual build
let building = false;
app.post('/build', async (req, res) => {
  if (building) {
    return res.redirect('/?message=Build already in progress');
  }
  building = true;
  const gitPush = req.body.git_push === '1';
  const bypassCache = req.body.bypass_cache === '1';
  try {
    await build({ gitPush, bypassCache });
    res.redirect('/?message=Build complete' + (gitPush ? ' and pushed' : ''));
  } catch (err) {
    console.error('Build failed:', err);
    res.redirect('/?message=Build failed: ' + err.message);
  } finally {
    building = false;
  }
});

// Schedule daily build at 6am
cron.schedule('0 6 * * *', async () => {
  console.log('Running scheduled build...');
  try {
    await build({ gitPush: true });
  } catch (err) {
    console.error('Scheduled build failed:', err);
  }
});

app.listen(PORT, () => {
  console.log(`Admin server running at http://localhost:${PORT}`);
});
