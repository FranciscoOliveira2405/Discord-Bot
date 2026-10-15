# Security Policy

## Supported versions

Only the latest release receives security fixes.

| Version | Supported |
| ------- | --------- |
| 2.x     | Yes       |
| < 2.0   | No        |

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report them privately through GitHub:
**Security tab > "Report a vulnerability"**
(https://github.com/FranciscoOliveira2405/Team-Discord-Bot/security/advisories/new)

Please include:

- a description of the problem and its impact,
- steps to reproduce it,
- the version you tested.

You can expect an answer within a few days. Once the issue is fixed, it will be disclosed in the release notes.

## Leaked credentials

If you find a Discord bot token or any other secret in this repository or its history, report it privately as described above. Any token that has been exposed must be considered compromised and reset in the Discord Developer Portal.

## Good practice for anyone running this bot

- Never commit your `.env` file. It is already in `.gitignore`.
- Keep the bot private (disable **Public Bot** in the Developer Portal).
- Give the bot only the permissions it needs.
- Keep dependencies up to date (`npm audit`).