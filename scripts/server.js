import express from 'express';
import cron from 'node-cron';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import nunjucks from 'nunjucks';
import { build } from './build.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 5050;
const DATA_DIR = join(__dirname, 'data');
const MANUAL_FILE = join(DATA_DIR, 'manual.json');
const TEMPLATES_DIR = join(__dirname, 'templates');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configure Nunjucks for admin templates
nunjucks.configure(TEMPLATES_DIR, {
  autoescape: true,
  express: app,
});

function loadManual() {
  try {
    if (existsSync(MANUAL_FILE)) {
      return JSON.parse(readFileSync(MANUAL_FILE, 'utf-8'));
    }
  } catch {}
  return { games: [], music: [] };
}

function saveManual(data) {
  writeFileSync(MANUAL_FILE, JSON.stringify(data, null, 2));
}

// Admin UI
app.get('/', (req, res) => {
  const manual = loadManual();
  res.render('admin.njk', {
    games: manual.games,
    music: manual.music,
    message: req.query.message || null,
  });
});

// Save games/music
app.post('/save', (req, res) => {
  const games = (req.body.games || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  const music = (req.body.music || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  saveManual({ games, music });
  res.redirect('/?message=Saved successfully');
});

// Trigger manual build
let building = false;
app.post('/build', async (req, res) => {
  if (building) {
    return res.redirect('/?message=Build already in progress');
  }
  building = true;
  try {
    await build({ gitPush: true });
    res.redirect('/?message=Build complete');
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
