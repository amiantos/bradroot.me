import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fetchAllData } from './fetch-data.js';
import { render } from './render.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8', ...opts });
}

export async function build({ gitPush = false } = {}) {
  console.log('=== Starting build ===');

  // 1. Fetch data
  let siteData;
  try {
    siteData = await fetchAllData();
    // Cache fetched data for debugging
    writeFileSync(
      join(__dirname, 'data', 'site_data.json'),
      JSON.stringify(siteData, null, 2)
    );
  } catch (err) {
    console.error('Data fetch failed, building with cached/empty data:', err.message);
    try {
      const { readFileSync } = await import('fs');
      siteData = JSON.parse(readFileSync(join(__dirname, 'data', 'site_data.json'), 'utf-8'));
    } catch {
      siteData = {};
    }
  }

  // 2. Render
  render(siteData);

  // 3. Git commit + push if requested
  if (gitPush) {
    try {
      const status = run('git status --porcelain website/');
      if (status.trim()) {
        run('git add website/');
        const date = new Date().toISOString().split('T')[0];
        run(`git commit -m "Build site ${date}"`);
        run('git push');
        console.log('Pushed changes to GitHub');
      } else {
        console.log('No changes to commit');
      }
    } catch (err) {
      console.error('Git operations failed:', err.message);
    }
  }

  console.log('=== Build complete ===');
}

// Run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const gitPush = process.argv.includes('--push');
  await build({ gitPush });
}
