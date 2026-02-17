# Pokémon TCG Catalog & Collection Tracker

This project started as a way to browse Pokémon TCG cards without relying on slow external APIs or an internet connection. It grew into a local-first collection tracker where you can search cards, mark what you own, and keep a wishlist.

Everything runs on a local SQLite database seeded from the Pokémon TCG JSON dataset, so once it’s set up, the app works fully offline.

---

## Features

- Search cards by name using full-text search
- Filter results by set, rarity, type, owned status, or wishlist status
- Track your collection with quantities
- Maintain a wishlist seperate from owned cards
- View individual card pages with images and metadata
- See basic collection stats (total cards, unique cards, common types)

---

## Screenshots

### Search Interface
<img src="./screenshots/pokemon-home-page.png" width="900"/>

### Search Results
<img src="./screenshots/pokemon-home-page2.png" width="900"/>

### Card Detail Page
<img src="./screenshots/pokemon-card-page.png" width="900"/>

### Collection View
<img src="./screenshots/pokemon-collection.png" width="900"/>

### Wishlist View
<img src="./screenshots/pokemon-wishlist.png" width="900"/>

--

## Tech Stack

- Frontend: Next.js, React, TypeScript
Used for routing, sever components, and type safety
- Backend: Next.js API Routes
Handles search, filters, collection updates, and wishlist actions
- Database: SQLite 
Keeps the project portable

---

## Implementation Notes

- Card search is powered by SQLite FTS5 which makes text search fast
- Images are loaded through a small proxy route to avoid CORS issues from the data source
- The UI is state-driven

---

## Running Locally

npm install  
npm run dev  

---

## Project Structure

app/
  api/
    search-cards/     # Full-text search endpoint (FTS5)
    collection/       # Collection CRUD
    wishlist/         # Wishlist CRUD
    filters/          # Filter metadata
    img/              # Image proxy

  page.tsx            # Home / search
  cards/[id]/page.tsx # Card detail page
  collection/page.tsx
  wishlist/page.tsx

lib/
  db.ts               # SQLite setup, schema, FTS helpers
  cache.ts            # Simple in-memory caching

scripts/
  seedCatalog.ts      # Seeds SQLite from JSON data

---

## Data & Database Setup

The app is offline-first and uses a local SQLite database generated from the Pokémon TCG JSON dataset.

Neither the raw data nor the generated database is committed to the repo.

### Data Source

Pokémon TCG JSON dataset:  
https://github.com/PokemonTCG/pokemon-tcg-data

### Local Setup

1. Download the Pokémon TCG JSON data (English)
2. Place it in:

```text
data/pokemon-tcg-data/
```

3. Seed the database:

```bash
npm run seed
```

This generates:

- data/app.db (SQLite database with FTS indexes)

After seeding, the app runs fully offline with fast local search.

---

## Future Improvements

- Sorting by release data or card number
- Deck building support
- Exporting collection date (CSV / JSON)
- Visual breakdowns of sets and types
- Pricing data
---
