# bradroot.me

This repo contains the contents of my website. That's all!

## Local Development

Install dependencies:

```
cd scripts && npm install && cd ..
npm install
```

Build the site (fetches live data and renders HTML):

```
node scripts/build.js
```

Preview the site locally:

```
python3 -m http.server 8000 --directory website
```

Then visit `http://localhost:8000`.

Run the admin server (dashboard editor + scheduled builds):

```
node scripts/server.js
```

Then visit `http://localhost:5050`.
