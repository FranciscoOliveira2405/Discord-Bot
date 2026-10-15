# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-10-15

### Breaking changes

- Permissions now use role **IDs**. Add `OWNER_ROLE_ID`, `MANAGERS_ROLE_ID` and `TEAM_ROLE_ID` to your `.env`; the bot will not start without them.
- The CS2 server monitor was removed (and with it the `gamedig` dependency).
- Node.js 20 or newer is required.
- The bot only answers in the server set in `GUILD_ID`.
- Run `npm run deploy` again, because command descriptions and input limits changed.

### Added

- Startup check of the `.env` values, with a clear message for anything missing or invalid.
- `/timezone add` accepts named zones such as `Europe/Berlin`, which follow daylight saving time, and offsets such as `GMT+5:30`.
- Events in the past are refused, and dates and times are validated (`99/99/9999` and `25:00` are no longer accepted).
- Length limits on text inputs (opponent, notes, reason, announcement, labels).
- Unit tests, ESLint and Prettier (`npm run verify`).
- GitHub Actions CI, CodeQL analysis, Dependabot, issue and pull request templates, `SECURITY.md`, `LICENSE`, `.env.example` and `.editorconfig`.
- Clean shutdown on Ctrl+C and when the host stops the process.

### Changed

- Renamed to **Team Bot**; the package is now `team-bot`.
- Portugal time follows the real `Europe/Lisbon` rules (UTC+0 in winter, UTC+1 in summer) instead of a fixed UTC+1.
- Players and absences are stored by Discord ID. Data from older versions is linked automatically when the bot starts.
- The database file is now `data/bot.db`; an existing `v3xys.db` is renamed automatically.
- Event notes are edited in a pop-up form instead of by typing a message, so the bot no longer needs the Message Content Intent.
- Only the Guilds and Server Members intents are requested.
- Nothing users type can ping anyone. Only @TEAM is pinged, and only where the bot does it on purpose.
- Boards, event embeds and replies share one implementation, which removes a lot of duplicated code.
- Errors are logged and reported properly instead of showing "Timed out" for everything.
- Replaced deprecated discord.js options (`ephemeral`, `fetchReply`, `ready`).
- SQLite runs in WAL mode.

### Fixed

- Event times, countdowns, timezone conversions and expiry were one hour wrong in winter.
- Absence ranges were not grouped correctly across a clock change on servers with daylight saving time.
- Two events created in the same millisecond could get the same ID.
- Players lost their roster entry and absences when they changed their Discord username.

### Security

- The bot token that was committed by mistake was reset, and `.env` was removed from the repository.
- Production dependencies have no known vulnerabilities (`npm audit` is clean).
- Role names can no longer be used to gain access, since permissions are checked by role ID.
- `.gitignore` now covers the whole `data/` folder and any `.env.*` file.

## [1.3.2]

### Changed

- Dependency updates.

## [1.3.0]

### Added

- CS2 server monitor.
- Absence counts by player.

## [1.2.1]

### Added

- Date-range absences, with range grouping on the board.

## [1.2.0]

### Changed

- Full rebuild with all data on SQLite, chronological sorting, board refresh on startup and a Portugal timezone fix.

## [1.1.0]

### Changed

- Migrated to SQLite, fixed the absence board and added the roster status system (Main, Subs, Tryouts, Stand-ins).

## [1.0.0]

- Initial release (Excel storage).

[2.0.0]: https://github.com/FranciscoOliveira2405/Team-Discord-Bot/releases/tag/v2.0.0
