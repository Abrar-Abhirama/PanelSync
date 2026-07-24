# Comic Aggregation Platform - Implementation Plan

This project will be built incrementally (Milestone-based) following the recommended architecture, starting from a solid Minimum Viable Product (MVP) and evolving into a robust distributed system. 

As requested, the database will store **image URLs**, not the physical image files.

## Technology Stack
- **Frontend**: React / Next.js + TypeScript
- **Backend API**: Java + Spring Boot
- **Database**: PostgreSQL
- **Scraper System**: Python (with ecosystem tools like Celery for queueing, depending on future choices)
- **Cache**: Redis
- **Deployment**: Docker

## User Review Required

> [!IMPORTANT]
> Please review the initial architecture and database schema (Phase 1) below. As recommended, we will start with the **database design and API contracts** first before building the scraper or frontend. The technology stack has been updated to match your preference.

## Open Questions

> [!WARNING]
> 1. **Initial Scraping Target**: Which specific comic website do you want to use as the first scraping target (Source A) in Phase 2?

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

**2. Backend API Contracts (Java + Spring Boot)**
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

**1. First Scraper (Python)**
- Build the scraper architecture with a single comic *source*.
- Implement a *Parser* to fetch the list of comics, chapters, and extract *image URLs*.
- Save the scraped data directly to the PostgreSQL database.

**2. Source Abstraction & Adapter**
- Implement an abstract interface (`ComicSource`) in Python.
- Create specific adapters for each *source* to produce a standardized data structure.
- Add a second *source* (Source B) to test the adapter system.

---

### Phase 3: Asynchronous Processing (Milestones 5 & 6)

Enhancing the scraping system's reliability so it doesn't overload the server and handles errors gracefully.

**1. Queue & Background Worker**
- Use Redis + a task queue (e.g., Celery) to manage *Scraping Jobs*.
- Build a dedicated Worker that consumes jobs from the queue, executes the scraping, and saves to the database.

**2. Resiliency Features**
- Implement a *Retry Mechanism* with *Exponential Backoff*.
- Add *Rate Limiting* to respect the source servers.
- Add *Validation* (ensure pages are not empty) and *Anomaly Detection* (prevent mass deletion if a source goes down).

---

### Phase 4: Optimization & Production-Readiness (Milestones 7 & 8)

Adding the performance, search, and observability layers.

**1. Caching & Search**
- Implement Redis Cache for frequently accessed endpoints (e.g., popular comic details).
- Utilize PostgreSQL Full-Text Search for the comic search feature.

**2. Observability & Deployment**
- Add centralized Logging and Metrics (e.g., *success rate*, *scraping duration*).
- Set up Docker containerization for all components (Frontend, API, Python Worker, Redis, PostgreSQL).
- (Optional) Set up a CI/CD pipeline (e.g., GitHub Actions).

## Verification Plan

### Automated Tests
- **Backend API (Spring Boot)**: Unit testing for each endpoint using JUnit/Mockito.
- **Scraper (Python)**: Create *HTML Fixtures* to ensure the parser can extract data from static HTML, which will *fail* if the source HTML structure changes.

### Manual Verification
- Run a trial scrape on a single comic.
- Open the Frontend Reader and verify that the image pages load smoothly using the `image_url` stored in the database.
- Ensure chapter transitions and *reading progress* are saved correctly to the database.
