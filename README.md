# Nookara Forums

Community boards for Nookara: communities, topics, a Hot/New/Top feed and moderation tools. Live at https://forums.nookara.cc.

This is the browser app only: plain HTML, CSS and JavaScript, no build step. The server side
(`/forums/api`, storage, moderation, sign-in) is part of Nookara and isn't in this repository.

## How it runs

The page is served by Nookara on `forums.nookara.cc`, which also serves what it loads besides its own files:

| Path | What |
|---|---|
| `/forums/api/*` | the Nookara Forums API (signed-in calls use the Nookara Forums app's own token) |
| `/auth/ext-code`, `/auth/ext-code/exchange` | sign-in through a Nookara popup |
| `/assets/js/i18n.js`, `/locales/<lang>.json` | translations (`locales/` here holds the `forums` strings) |
| `/login/lucide.min.js` | [Lucide](https://lucide.dev) icons |

The files here are exported from Nookara's own source on each release, so issues and ideas are welcome;
pull requests are read and ported over by hand.

## License

AGPL-3.0, see [LICENSE](LICENSE).
