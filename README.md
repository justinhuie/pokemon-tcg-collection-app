# Pokémon TCG Catalog & Collection Tracker

A full-stack web application for browsing, searching, and managing a Pokémon TCG card collection.

Built to mirror real production features such as full-text search, filtering, pagination, and persistent local data.

---

## ✨ Features

- 🔍 Full-text card search powered by SQLite FTS5
- 🧩 Filtering by set, rarity, type, owned status, and wishlisted status
- 📄 Pagination with “Load more” for large result sets
- 📦 Collection tracking with quantity support
- ⭐ Wishlist management
- 📊 Collection statistics (unique cards, total quantity, top types)
- 🖼 Card detail pages with images and metadata
- 📱 Fully responsive, dark-themed UI

---

## 🛠 Tech Stack

- Frontend: Next.js (App Router), React, TypeScript
- Backend: Next.js API Routes
- Database: SQLite (local, offline-first)
- Search: SQLite Full-Text Search (FTS5)
- Styling: Minimal dark UI using modern CSS patterns

---

## 🧠 Architecture Highlights

- RESTful API routes with efficient SQL joins for derived data (collection and wishlist badges)
- Deterministic pagination and stable sorting for consistent results
- SQLite FTS5 for fast, scalable offline text search
- Clear separation of concerns between UI components, API logic, and database access
- State-driven UI with graceful loading and error handling

---

## ▶️ Running Locally

npm install  
npm run dev  

---

## 📁 Project Structure

app/
├─ api/                 # REST API routes (search, collection, wishlist, image proxy)
├─ components/          # Reusable UI components (buttons, cards, nav, badges)
├─ cards/               # Dynamic card detail pages (/cards/[id])
├─ collection/          # Collection page
├─ wishlist/            # Wishlist page
│
├─ lib/
│  ├─ db.ts             # SQLite connection, schema, migrations, FTS helpers
│  └─ cache.ts          # Simple in-memory caching utilities
│
├─ scripts/
│  └─ seedCatalog.ts    # Script to seed the local card catalog database
