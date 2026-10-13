# Discord Bot

A bot to manage a Discord server for a team: scheduling, roster, absences, timezones, announcements and moderation, all through slash commands.

Built with Node.js and Discord.js v14, backed by SQLite.

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

- **Node.js 20+** + **Discord.js v14**
- **better-sqlite3** : persistent local database
- **node-cron** : scheduled tasks (reminders, cleanup)

---

## Project Structure

```text
Discord-Bot/
├─ commands/
│  ├─ events/      → schedule, reminder
│  ├─ general/     → announce
│  ├─ server/      → clear, lock, slowmode, unlock
│  └─ team/        → roster, absent, timezone
├─ utils/
│  ├─ managers/    → schedule, absence, reminder, timezone
│  ├─ constants.js → shared config, helpers, permissions
│  └─ dbManager.js → SQLite data layer
├─ data/           → SQLite database (auto-created)
├─ index.js        → entry point
├─ deploy-commands.js
└─ package.json
```

---

## Setup

### Prerequisites
- Node.js 20 or newer
- A Discord bot application ([Discord Developer Portal](https://discord.com/developers/applications))

### Installation

```bash
git clone https://github.com/FranciscoOliveira2405/Discord-Bot.git
cd Discord-Bot
npm install
```

### Configuration

Create a `.env` file in the root:

```text
TOKEN=your_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id
```

**Never commit your `.env` file or share your bot token.** The file is already listed in `.gitignore`. If a token is ever exposed, reset it immediately in the Discord Developer Portal.

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

## Required Roles

`OWNER`, `MANAGERS`, `TEAM`

---

## Hosting

The bot needs to run continuously (24/7) on any machine or host with Node.js 20+. Install dependencies with `npm ci`, set the environment variables from the Configuration section, then run `npm start`.

When adding a dependency, run `npm install` locally and commit the updated `package-lock.json`.

---

## Versioning

Current version: **1.3.2**

- **1.0** : Initial release (Excel storage)
- **1.1** : Migrated to SQLite, fixed absence board, roster status system (Main/Subs/Tryouts/Stand-ins)
- **1.2** : Full rebuild, all data on SQLite, chronological sorting, board refresh on startup, Portugal timezone fix
- **1.2.1** : Date-range absences, range grouping on the board
- **1.3** : Absence counts by player
- **1.3.2** : Dependency updates

---

## License

ISC
