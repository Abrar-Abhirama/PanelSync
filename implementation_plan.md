# Comic Aggregation Platform - Implementation Plan

This project will be built incrementally (Milestone-based) following the recommended architecture, starting from a solid Minimum Viable Product (MVP) and evolving into a robust distributed system. 

As requested, the database will store **image URLs**, not the physical image files.

## Technology Stack
- **Frontend**: React / Next.js + TypeScript
- **Backend API**: Node.js + Express (JavaScript)
- **Database**: PostgreSQL (using Prisma or Sequelize as ORM)
- **Scraper System**: Node.js / TypeScript (Using Playwright and Cheerio)
- **Cache**: Redis
- **Deployment**: Docker

## User Review Required

> [!IMPORTANT]
> The plan has been updated to switch the backend from Java (Spring Boot) to **Node.js (Express) using JavaScript**. This allows us to use `package.json` for dependency management as requested. Please review the updated technology stack and Phase 1 plan.

> [!IMPORTANT]
> The target for the first scraper has been set to **Asura Scans**. We have also switched the scraper language from Python to **Node.js / TypeScript** to allow us to reuse the existing Prisma Database Client and keep the entire project in a single language. We will use `playwright` to bypass Cloudflare.

## Proposed Implementation Phases

### Phase 1: MVP Backend & Database (Milestones 1 & 2)

The main focus is to set up the data foundation and APIs for reading comics.

**1. Database Design (PostgreSQL)**
Initial tables to be created:
- `users`: id, username, created_at
- `comics`: id, title, description, cover_url, source_id, created_at
- `chapters`: id, comic_id, title, chapter_number, created_at
- `pages`: id, chapter_id, page_number, **image_url** (Storing the URL instead of the physical image)

User Features (Milestone 2):
- `reading_progress`: user_id, comic_id, chapter_id, page_number, updated_at
- `bookmarks`: user_id, comic_id, created_at
- `reading_history`: user_id, comic_id, chapter_id, read_at

**2. Backend API Contracts (Node.js + Express)**
Creating the basic REST API endpoints:
- `GET /api/comics` - Get a list of comics
- `GET /api/comics/{id}` - Get comic details
- `GET /api/comics/{id}/chapters` - Get a list of chapters for a comic
- `GET /api/chapters/{id}/pages` - Get the pages (image URLs) for a chapter
- Endpoints for Auth, Reading Progress, and Bookmarks.

**3. Basic Web Reader (Next.js + TypeScript)**
Create a simple web interface to read comics consuming the APIs built above.

---

### Phase 2: Scraper Architecture (Milestones 3 & 4)

Decoupling the scraping system from the main backend API using Python.

**1. First Scraper (Node.js - Target: Asura Scans)**
- Build the scraper architecture inside a new `scraper` directory using Node.js.
- Use `playwright` to bypass Asura Scans' Cloudflare protection and `cheerio` to parse the HTML.
- Reuse the existing Prisma Client to save the scraped data directly to the PostgreSQL database.

**2. Source Abstraction & Adapter (The Scraper Interface)**
To prevent our code from breaking when a website changes, and to allow us to easily add 50 different comic websites, we will use Object-Oriented Abstraction.
- Create an abstract `ComicSource` interface in TypeScript:
  - `getBrowse(page)`: Returns a standardized array of comics.
  - `getDetails(comicUrl)`: Returns the description and chapter list.
  - `getPages(chapterUrl)`: Returns the array of image URLs.
- The main system will only ever talk to `ComicSource`. 
- We will build an `AsuraAdapter` that *implements* `ComicSource`. If Asura changes their HTML, only the `AsuraAdapter` breaks, while the rest of the app (and other sources) keep running perfectly.

### Phase 3: Premium Frontend & Reader Overhaul (Current Priority)

The backend scraper works flawlessly, so our immediate priority is completely overhauling the Next.js frontend. Currently, it is functional but lacks the high-end aesthetic required for modern web apps. We need to implement a stunning UI that feels premium and state-of-the-art.

**1. Global Aesthetic Upgrade**
- Upgrade `globals.css` with a premium dark-mode color palette (deep zincs and vibrant purples).
- Add modern typography (e.g., Inter or Outfit via Next/Font).
- Implement glassmorphism effects and smooth hover micro-animations across all comic cards.

**2. The Reader Experience (Bug Fixes & UI)**
- Fix any broken image layouts on the Reader page (ensure 100% responsive width).
- Build a sticky top-bar and bottom-bar for the Reader with "Previous Chapter" and "Next Chapter" navigation logic.
- Add a floating "Back to Details" button so you aren't trapped in the reader.

**3. Home & Details Page Polish**
- Ensure the comic grid (`page.tsx`) uses staggered CSS animations for a "wow" effect on load.
- Enhance the Details page (`[id]/page.tsx`) with a blurred background banner matching the comic cover.

## User Review Required

> [!IMPORTANT]
> Since the core data pipeline is working, we are shifting our priority from Backend to Frontend UI/UX. Please review the new Phase 3 plan above. Do these aesthetic priorities align with what you want to fix? Are there any specific bugs in the Reader you want me to focus on first?

### Phase 5: User Login, Bookmarks & Paywall

**Goal**: Allow users to create accounts, log in, bookmark comics, and restrict non-logged in users to reading exactly 1 chapter.

**1. Backend Auth & Database (Prisma + Express)**
- Add `password` to the `User` model in `schema.prisma`.
- Install `bcrypt` for password hashing and `jsonwebtoken` (JWT) for secure authentication.
- Create `/api/auth/register` and `/api/auth/login` endpoints that return a JWT token.
- Create `POST /api/bookmarks` and `GET /api/bookmarks` to manage user bookmarks (protected by a JWT auth middleware).

**2. Frontend Authentication State**
- Create a global `AuthContext` in Next.js to keep track of whether the user is logged in.
- Build a beautiful, animated **Login / Register Modal** that can pop up over any page.
- Update the Header to show "Login" or the User's Name / Logout button.

**3. The 1-Chapter Paywall (Cookies)**
- When a user opens a Chapter, we will check if they are logged in via the `AuthContext`.
- If they are NOT logged in, we will check their browser Cookies (using a library like `js-cookie`) for a `free_chapter_read` cookie.
- If the cookie doesn't exist, we let them read and set the cookie to `true` (expiring in 30 days or never).
- If the cookie *does* exist, instead of showing the comic images, we will blur the screen and pop up the **Login Modal**, forcing them to create an account or log in to continue reading!

**4. Bookmarks UI**
- Add a "Bookmark" button to the Comic Details page.
- Create a dedicated `/bookmarks` page for logged-in users to see their saved comics.

## User Review Required

> [!IMPORTANT]
> The plan for Phase 5 has been written out above! 
> I will use browser Cookies to track the non-logged in users just as you suggested, which is the perfect approach for a paywall.
> 
> **Does this plan look good to you? If so, hit Proceed!**
