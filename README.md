# SITG Knowledge Search Platform

A lightweight, high-performance, zero-cost, and zero-maintenance static search platform customized for the SITG knowledge estate. 

## Deployment Setup

### GitHub Pages Deployment
1. Create a new public or private repository on GitHub.
2. Commit all 4 platform engine assets (`index.html`, `search-index.json`, `sitg-search-engine.js`, `search-overlay.css`) directly into the repository root directory (`/`).
3. Head to **Settings > Pages**. Under **Build and deployment**, set the source path option framework target branch to `main` (or `master`) and folder path layout structure to `/ (root)`. Save configurations.

### Wix Header Global Integration
To map the platform onto live Wix environments, go to your **Wix Dashboard > Settings > Custom Code (Advanced)** layout. Create a brand-new header script injected into **All Pages**, pasting the full initialization markup structure specified inside the body container of your local `index.html` file template layout, ensuring your static target file asset URL paths route straight to your hosted asset distribution domain links.