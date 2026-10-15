# Team Bot

[![CI](https://github.com/FranciscoOliveira2405/Team-Discord-Bot/actions/workflows/ci.yml/badge.svg)](https://github.com/FranciscoOliveira2405/Team-Discord-Bot/actions/workflows/ci.yml)
[![CodeQL](https://github.com/FranciscoOliveira2405/Team-Discord-Bot/actions/workflows/codeql.yml/badge.svg)](https://github.com/FranciscoOliveira2405/Team-Discord-Bot/actions/workflows/codeql.yml)
![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)
[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

A Discord bot that helps a team run its server: schedule, roster, absences, timezones, announcements and moderation, all through slash commands.

Built with Node.js and discord.js v14, with data stored in a local SQLite database.

---

## Features

### Schedule

- `/schedule` : view, add and remove events, and edit their notes
- Event types: **Practice**, **Official Match**, **Scrimmage**, **VOD Review**, each color-coded
- Auto-updating `#schedule` board, sorted chronologically
- Every event shows a countdown and the time in each configured timezone
- Dates and times are validated, and events in the past are refused
- Expired events are removed automatically at midnight
- Daily reminders at 9 AM for the day's events, and `/reminder` to send one by hand

### Roster

- `/roster` : view, add, update and remove players
- Several roles per player (for example Entry + IGL)
- Status categories: Main, Subs, Tryouts, Stand-ins
- Players are tracked by their Discord ID, so a username change never breaks their entry

### Absences

- `/absent add` : one day or a **date range** (`01/06/2026-05/06/2026`, up to 30 days)
- `/absent remove` : remove one date, one range, or all absences of a player
- Auto-updating `#absences` board that groups consecutive days into ranges and counts players, not days
- Duplicate dates are skipped, and past absences expire at midnight

### Timezones

- `/timezone add | remove | view` : choose the timezones shown on every event
- Base timezone: **Portugal (Europe/Lisbon)**, which follows the summer and winter clock changes
- Add a zone as a fixed offset (`GMT+2`, `GMT-3`, `GMT+5:30`) or as a name (`Europe/Berlin`).
  Names follow daylight saving time automatically; fixed offsets do not.

### Announcements and moderation

- `/announce` : formatted announcement in `#announcements`, pinging @TEAM
- `/clear` : delete 1 to 100 recent messages (Discord cannot bulk delete messages older than 14 days)
- `/slowmode` : set the channel slowmode
- `/lock` and `/unlock` : lock or unlock a channel

---

## Commands and permissions

Access is decided by role **ID**, never by role name.

| Command                              | Who can use it           |
| ------------------------------------ | ------------------------ |
| `/schedule view`                     | TEAM, MANAGERS, OWNER    |
| `/roster view`                       | TEAM, MANAGERS, OWNER    |
| `/absent add`, `/absent remove`      | TEAM, MANAGERS, OWNER    |
| `/schedule add`, `remove`, `notes`   | MANAGERS, OWNER          |
| `/roster add`, `update`, `remove`    | MANAGERS, OWNER          |
| `/timezone`, `/reminder`             | MANAGERS, OWNER          |
| `/announce`                          | MANAGERS, OWNER          |
| `/clear`, `/slowmode`, `/lock`, `/unlock` | MANAGERS, OWNER     |

The commands that are entirely for managers (`/timezone`, `/reminder`, `/announce`, `/clear`, `/slowmode`, `/lock`, `/unlock`)
are hidden in Discord by default. See [step 5 of the setup](#5-let-your-managers-use-the-restricted-commands).
For `/schedule` and `/roster` the bot checks the role of whoever picks an action.
The bot only answers inside the server set in `GUILD_ID`.

---

## Setup

### Requirements

- Node.js 20 or newer
- A Discord application with a bot ([Discord Developer Portal](https://discord.com/developers/applications))

### 1. Create the bot

In the Developer Portal:

1. **Bot** tab: copy the token (reset it if it was ever exposed).
2. Under **Privileged Gateway Intents**, turn on **Server Members Intent**. The bot does not need Message Content Intent.
3. Turn **Public Bot** off, so nobody else can add your bot to another server.
4. Invite the bot with the scopes `bot` and `applications.commands`. It needs these permissions:
   View Channels, Send Messages, Embed Links, Read Message History, Manage Messages (for `/clear`),
   Manage Channels (for `/lock` and `/slowmode`), and permission to mention roles (for @TEAM pings).

### 2. Install

```bash
git clone https://github.com/FranciscoOliveira2405/Team-Discord-Bot.git
cd Team-Discord-Bot
npm install
```

### 3. Configure

Copy `.env.example` to `.env` and fill it in:

```text
TOKEN=your_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id
OWNER_ROLE_ID=id_of_the_OWNER_role
MANAGERS_ROLE_ID=id_of_the_MANAGERS_role
TEAM_ROLE_ID=id_of_the_TEAM_role
```

To copy an ID, turn on **Developer Mode** in Discord (User Settings > Advanced), then right-click the server or role and choose **Copy ID**.

The bot checks these values when it starts and tells you exactly what is missing or wrong.

**Never commit your `.env` file or share your bot token.** It is already in `.gitignore`.
If a token is ever exposed, reset it immediately in the Developer Portal.

### 4. Register the slash commands

```bash
npm run deploy
```

Run this again whenever a command definition changes.

### 5. Let your managers use the restricted commands

The manager-only commands are hidden from everyone except server administrators until you allow them.
In Discord, open **Server Settings > Integrations > your bot**, and for each of `/timezone`, `/reminder`, `/announce`,
`/clear`, `/slowmode`, `/lock` and `/unlock` add the **OWNER** and **MANAGERS** roles.

### 6. Start the bot

```bash
npm start
```

The bot has to keep running to answer commands and send reminders. Run it on a machine that stays on, or use a process manager such as [pm2](https://pm2.keymetrics.io/).

### Required channels and roles

The bot finds these channels by name:

| Channel          | Purpose                      |
| ---------------- | ---------------------------- |
| `#schedule`      | Auto-updating event board    |
| `#absences`      | Auto-updating absence board  |
| `#reminders`     | Daily and manual reminders   |
| `#announcements` | Announcements                |

Roles: **OWNER**, **MANAGERS** and **TEAM** (their IDs go in `.env`).

---

## Data

Everything is stored in `data/bot.db` (SQLite). Back this file up if the data matters to you.
The `data/` folder is created automatically and is never committed.

## Development

```bash
npm run lint           # ESLint
npm run format:check   # Prettier
npm test               # unit tests (Node's built-in test runner)
npm run check          # loads every slash command and validates it
npm run verify         # all of the above
```

The same checks run on every push and pull request through GitHub Actions. CodeQL scans the code for vulnerabilities and Dependabot keeps dependencies up to date.

### Project structure

```text
Team-Discord-Bot/
├─ commands/
│  ├─ events/       schedule, reminder
│  ├─ general/      announce
│  ├─ server/       clear, lock, slowmode, unlock
│  └─ team/         roster, absent, timezone
├─ utils/
│  ├─ managers/     boards, reminders, timezones, member sync
│  ├─ config.js     environment variables
│  ├─ constants.js  shared constants and permission checks
│  ├─ dbManager.js  SQLite data layer
│  ├─ embeds.js     shared embed builders
│  └─ time.js       dates, times and timezones
├─ test/            unit tests
├─ scripts/         helper scripts (used by CI)
├─ .github/         CI, CodeQL, Dependabot, templates, security policy
├─ index.js         entry point
└─ deploy-commands.js
```

---

## Security

Please report vulnerabilities privately. See the [security policy](.github/SECURITY.md).

## Versioning

This project follows [Semantic Versioning](https://semver.org/). The current version is **2.0.0**.
All changes are listed in the [changelog](CHANGELOG.md).

## License

[ISC](LICENSE)
