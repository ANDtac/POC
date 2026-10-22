# Professor Oak Challenge

A tracker for the Professor Oak Challenge: before each gym leader, catch and evolve every Pokémon you can get up to that point.

Challenge structure follows the [guides by Mewlax84](https://www.reddit.com/r/ProfessorOak/comments/bj6yeh/professor_oak_challenge_guides/?show=original).

## Features

- **Runs.** Start a run for a game and version. Exclusives from the other version are hidden and left out of the totals by default.
- **Tracker.**
  - One section per milestone ("Before Brock", "Before Misty", ...), each with its own progress bar.
  - Tap a Pokémon to mark it caught. A 5-second undo follows every tap.
  - Once a section is complete, the tracker says you are ready for the gym and lets you advance.
- **Location view.** Everything left on a route in one list. Evolutions sit in their own group.
- **Filters.** Search by name, dex number or location (press `/` to focus). Filter by method (catch, level up, stone, trade evo, NPC trade, prize, ...). Show missing only. Show or hide other-version exclusives.
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
- Frontend: Vitest on the guide helpers (progress, filters, location grouping).

## Guide data

Guides live in `backend/data/guides/<game>.json` and are checked when the API starts. A malformed guide stops startup with a clear error.

```json
{
  "id": "yellow",
  "name": "Pokémon Yellow",
  "generation": 1,
  "versions": [{ "id": "yellow", "name": "Yellow" }],
  "verified": false,
  "source": { "name": "Mewlax's Professor Oak Challenge Guide: Pokémon Yellow", "url": "https://docs.google.com/..." },
  "sections": [
    {
      "id": "brock",
      "label": "Before Brock",
      "leader": "Brock",
      "entries": [
        { "id": "0016", "name": "Pidgey", "location": "<as written in the guide>", "method": "catch", "notes": "<optional>" }
      ]
    }
  ]
}
```

- `id`: four-digit national dex number, with an optional form suffix (`0052-alola`).
- `method`: one of `catch`, `evolve`, `stone`, `trade-evolve`, `gift`, `fossil`, `static`, `in-game-trade`, `prize`, `trade`, `event`.
- `versions`: leave it out when an entry is in every version.

### Source data

Guide content must come from Mewlax84's guides, not be written by hand from memory. The guides are Google Docs:

- [Yellow](https://docs.google.com/document/d/1_ffM1uUOhfVgxkQfhe41qPq1KHZ_ISAzxnJtHt23u9M/edit)
- [FireRed/LeafGreen](https://docs.google.com/document/d/1KF_Qkn5YnPcYvSDVaI3mMhS8RgBsHRsXmbXWCzOhRk0/edit)
- [Emerald](https://docs.google.com/document/d/1cn5awGNEVZx3wuv-2EsIn3e746RfH5-Spm7mnP-_PxU/edit)

The full list is in the [Reddit index post](https://www.reddit.com/r/ProfessorOak/comments/bj6yeh/professor_oak_challenge_guides/). No guide is bundled yet. Each one is converted from its document into a JSON file and keeps the guide's own sections, locations and notes. Set `"verified": true` once the converted file has been checked against the document.

Tests use a small fixture in `backend/tests/fixtures/guides/`. It is not challenge data.

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
- `POST /api/runs`: start a run. Body: `{ game_id, version, title? }`.
- `GET /api/runs/:id`: get a run with its caught list.
- `PATCH /api/runs/:id`: update `title`, `current_section`, `status` or `is_public`.
- `DELETE /api/runs/:id`: delete a run.
- `PUT /api/runs/:id/caught/:pokemon_id`: mark a Pokémon caught. Idempotent.
- `DELETE /api/runs/:id/caught/:pokemon_id`: unmark it. Idempotent.
- `PATCH /api/runs/:id/caught`: bulk change. Body: `{ add: [], remove: [] }`.

## Roadmap

- Import Mewlax84's guides, starting with Yellow.
- Guest mode: track in the browser without an account, and import the run on sign-up.
- Export and import a run as JSON.
- Run stats: the date each milestone was cleared, and catches per section.
- Notes on each Pokémon, such as nickname or encounter details.
- Offline support (PWA): cache guides and sprites.
