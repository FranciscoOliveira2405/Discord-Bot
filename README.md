# v3xys Bot

A Discord bot for managing the **v3xys** CS2 team: scheduling, roster, absences, timezones, announcements, server monitoring, and moderation, all through slash commands.

Built with Node.js and Discord.js v14, backed by SQLite, and deployed 24/7 on Railway.

---

## Features

### Schedule
- `/schedule` : view, add, remove events and edit notes in one command
- Event types: **Practice**, **Official Match**, **Scrimmage**, **VOD Review** : each color-coded
- Auto-updating `#schedule` board that always reflects the current events
- Events sorted chronologically
- Automatic midnight cleanup of expired events
- 9 AM daily reminders for the day's events
- `/reminder` : manually push a reminder at any time
- Timezone conversions shown on every event

### Roster
- `/roster` : view, add, update and remove players
- Multi-role support per player (e.g. Entry + IGL)
- Status categories: Main, Subs, Tryouts, Stand-ins
- Sorted by status
- Viewable by all TEAM members

### Absences
- `/absent add` : mark a player absent for a single day or a **date range** (e.g. `01/06/2026-05/06/2026`)
- `/absent remove` : remove a single date, a range, or all absences for a player
- Auto-updating `#absences` board grouping consecutive dates into ranges
- Counts unique players, not individual days
- Duplicate-date protection
- Auto-expires at midnight

### Timezones
- `/timezone add/remove/view` : manage team timezones
- Base timezone: **Portugal (GMT+1)**
- Converts every event time to all configured timezones

### CS2 Server Monitor
- Automatically checks the CS2 server every minute
- Renames the `#cs2-server` channel based on status (online / offline)
- Live embed with player count and connect info

### Announcements
- `/announce` : formatted announcement to `#announcements`, pings @TEAM

### Server Moderation
- `/clear` : bulk delete up to 100 messages
- `/slowmode` : set channel slowmode
- `/lock` / `/unlock` : lock or unlock a channel

---

## Permissions

| Role | Access |
|------|--------|
| **OWNER** + **MANAGERS** | Full access to everything |
| **TEAM** | View schedule, view roster, manage absences |

Restricted commands are hidden from TEAM via Discord integrations.

---

## Tech Stack

- **Node.js** + **Discord.js v14**
- **better-sqlite3** : persistent local database
- **node-cron** : scheduled tasks (reminders, cleanup)
- **gamedig** : CS2 server status queries
- Hosted on **Railway** (24/7, auto-deploys from GitHub)

---

## Project Structure

```text
v3xys-bot/
├─ commands/
│  ├─ events/      → schedule, reminder
│  ├─ general/     → announce
│  ├─ server/      → clear, lock, slowmode, unlock
│  └─ team/        → roster, absent, timezone
├─ utils/
│  ├─ managers/    → schedule, absence, reminder, timezone, server monitor
│  ├─ constants.js → shared config, helpers, permissions
│  └─ dbManager.js → SQLite data layer
├─ data/           → SQLite DB + message state (auto-created)
├─ index.js        → entry point
├─ deploy-commands.js
└─ package.json
```

---

## Setup

### Prerequisites
- Node.js 18+
- A Discord bot application ([Discord Developer Portal](https://discord.com/developers/applications))

### Installation

```bash
git clone https://github.com/FranciscoSilva2405/v3xys-bot.git
cd v3xys-bot
npm install
```

### Configuration

Create a `.env` file in the root:

```text
TOKEN=your_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id
```

### Register slash commands

```bash
node deploy-commands.js
```

### Run

```bash
npm start
```

---

## Required Discord Channels

The bot looks for these channels by name:

| Channel | Purpose |
|---------|---------|
| `#schedule` | Auto-updating event board |
| `#absences` | Auto-updating absence board |
| `#reminders` | Daily and manual reminders |
| `#announcements` | Announcements |
| `#cs2-server` | Server status (auto-renamed) |

## Required Roles

`OWNER`, `MANAGERS`, `TEAM`

---

## Deployment (Railway)

The bot auto-deploys from the `main` branch. Railway runs `npm ci` then `npm start`.

**Important:** `node_modules/` and `.env` are gitignored. When adding a dependency, always run `npm install` locally and commit the updated `package-lock.json` so Railway's `npm ci` stays in sync.

---

## Versioning

Current version: **1.3.2**

- **1.0** — Initial release (Excel storage)
- **1.1** — Migrated to SQLite, fixed absence board, roster status system (Main/Subs/Tryouts/Stand-ins)
- **1.2** — Full rebuild, all data on SQLite, chronological sorting, board refresh on startup, Portugal timezone fix
- **1.21** — Date-range absences, range grouping on the board
- **1.3** — CS2 server monitor, absence counts by player
- **1.3.1** — Server monitor moved to new SCL host
- **1.3.2** — Upgraded to GameDig v5 with counterstrike2 query type

---

## License

ISC
