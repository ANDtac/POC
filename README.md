# Professor Oak Challenge

A tracker for the Professor Oak Challenge: before each gym badge, catch and evolve every Pokémon you can get up to that point.

The challenge guides are by [u/mewlax84](https://www.reddit.com/r/ProfessorOak/comments/bj6yeh/professor_oak_challenge_guides/). The guide data for all 16 games comes from the [Oak Challenge Tracker](https://github.com/EzraSkwarka/OakChallenge) by EzraSkwarka (MIT). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Features

- **16 games:** Red, Blue, Yellow, Gold, Silver, Crystal, Ruby, Sapphire, Emerald, FireRed, LeafGreen, Diamond, Pearl, Platinum, HeartGold and SoulSilver.
- **Full guide text.** Every section keeps its guide notes from the source, plus each game's "About this guide" tips.
- **Guide choices.** Starter, fossil, Moon Stones, Eeveelution, Hitmon and so on, each with the guide's limit (for example "choose 2"). Rows that depend on a choice appear once you make it, and progress counts only what your choices unlock.
- **Runs.** Several runs per account, saved on the server, so progress follows you across devices.
- **Tracker.**
  - One section per badge, each with its own progress bar.
  - Tap a Pokémon to mark it caught. A 5-second undo follows every tap.
  - "Mark all caught" for a section.
  - Once a section is complete, advance to the next badge.
- **Views and search.** Switch between "By badge" and "By place", which groups rows by where the guide says to catch them. Search by name, dex number or method text (press `/` to focus). Show missing only.
- **Sprites** for the game you are playing (Red/Blue, Yellow, Gold, ...), loaded from PokéAPI.
- **Sharing.** Make a run public and anyone with the link can view it, read-only.
- **Accounts.** Register, log in, edit profile, change password (the current password is required), delete account (runs are deleted with it).
- **API docs.** Swagger at `/api-docs`.

## Setup

Requires Node 22.9 or newer.

```sh
git clone https://github.com/ANDtac/POC.git
cd POC
npm run install:all
cp backend/.env.example backend/.env   # then set JWT_SECRET
npm run dev
```

- Web app: http://localhost:3000. Vite proxies `/api` to the backend.
- API: http://localhost:5050
- API docs: http://localhost:5050/api-docs

The API refuses to start without `JWT_SECRET`. The SQLite file (`backend/database.sqlite`) is created on first start and is not committed. If you have a database from the old schema, delete it.

## Tests

```sh
npm test
```

- Backend: Jest and supertest against the real Express app, on an in-memory SQLite database.
- Frontend: Vitest on the guide helpers (choice gating, progress, search, place grouping, sprites).

## Guide data

Guides live in `backend/data/guides/<game>.json`. `backend/scripts/import-oak-tracker.js` generates them from a checkout of the Oak Challenge Tracker:

```sh
git clone https://github.com/EzraSkwarka/OakChallenge ../OakChallenge
cd backend
npm run import-guides -- ../../OakChallenge
```

The import copies section titles, guide notes, choice blocks, gating and method text as they are. It applies the source's own HeartGold/SoulSilver patches. It changes only these things, and logs each one:

- Three broken tag names in the HG/SS guide markup (`<stron>`, `</sttrong>`).
- Two misspelled Pokémon names in the LeafGreen rows (Ninetails, Azuril). The guide prose is not changed.
- Alternate-form dex numbers: rows map to the base species.

The API checks every guide at startup. A test checks each bundled file and confirms every Pokémon maps to a dex number from its generation.

Shape (trimmed):

```json
{
  "id": "red",
  "name": "Pokémon Red",
  "generation": 1,
  "versions": [{ "id": "red", "name": "Red" }],
  "spriteSet": "generation-i/red-blue/transparent",
  "about": "<section>...</section>",
  "source": { "guide": { "name": "...", "url": "..." }, "data": { "name": "...", "license": "MIT", "commit": "..." } },
  "sections": [
    {
      "id": "brock",
      "label": "Pre Badge #1 - Brock",
      "summaryShort": "...",
      "summaryHtml": "<h5>Pallet Town</h5>...",
      "choices": [
        { "key": "starter", "title": null, "cap": 1, "options": [{ "value": "bulbasaur", "name": "Bulbasaur", "dex": 1, "method": "..." }] }
      ],
      "entries": [
        { "id": "ivysaur", "name": "Ivysaur", "dex": 2, "method": "Evolve from Bulbasaur at level 16", "requires": [{ "key": "starter", "value": "bulbasaur" }] }
      ]
    }
  ]
}
```

A row shows when every `requires` pair is selected and no `requiresNot` pair is. That is the same rule the source tracker uses. Tests use a small fixture in `backend/tests/fixtures/guides/`.

## API

All run routes need `Authorization: Bearer <token>`. The one exception is `GET /api/runs/:id` on a public run.

### Auth

- `POST /api/auth/register`: create an account. Returns `{ token, user }`.
- `POST /api/auth/login`: returns `{ token, user }`.
- `GET /api/auth/verify`: returns the current user.

### User

- `GET /api/user`: get your profile.
- `PATCH /api/user`: update your profile.
- `DELETE /api/user`: delete your account.
- `GET /api/user/all`: list users, id and username only. Needs a token.
- `GET /api/user/:id`: public lookup, id and username only.

### Games

- `GET /api/games`: list the games that have a guide.
- `GET /api/games/:id`: get the full guide.

### Runs

- `GET /api/runs`: list your runs with progress.
- `POST /api/runs`: start a run. Body: `{ game_id, title? }`.
- `GET /api/runs/:id`: get a run with its caught list.
- `PATCH /api/runs/:id`: update `title`, `current_section`, `status` or `is_public`.
- `DELETE /api/runs/:id`: delete a run.
- `PUT /api/runs/:id/caught/:pokemon_id`: mark a Pokémon caught. Idempotent.
- `DELETE /api/runs/:id/caught/:pokemon_id`: unmark it. Idempotent.
- `PATCH /api/runs/:id/caught`: bulk change. Body: `{ add: [], remove: [] }`.
- `PUT /api/runs/:id/choices/:key`: set a guide choice. Body: `{ values: [] }`, up to the block's limit. An empty list clears it.

## Roadmap

- Guest mode: track in the browser without an account, as the original tracker does, and import the run on sign-up.
- The original tracker's extra tools: Rare Candy planner and National Dex tracker.
- Export and import a run as JSON.
- Run stats: the date each section was cleared.
- Offline support (PWA): cache guides and sprites.
