# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |

## Retired static deployment copy

The canonical production static site is [captjreacher/maximisedai-site](https://github.com/captjreacher/maximisedai-site).
Cloudflare's active version aea10539 matches that repository's successful
[deployment run 37939981704](https://github.com/captjreacher/maximisedai-site/actions/runs/37939981704)
from commit 2433b744eedfcedd6c1eb84869ee7efcba2d93f5.

This site tree remains available for historical development, but its static
production workflow, deploy script and Wrangler config have been removed to
prevent it overwriting the canonical site. WordPress deployment in
.github/workflows/deploy.yml remains unchanged.

Billing catalogue refreshes must target captjreacher/maximisedai-site using
billing-maxai-catalogue-published. The correction is prepared in BILLING #45;
no live configuration has been changed. Maxai #5 is superseded for the BILLING
release and must not be merged as its consumer dependency.

Before an approved release, retire this duplicate path, release the canonical
availability fix, then release the corrected Billing API and Cockpit in the
sequence documented in BILLING's docs/offer-archiving-release.md. Cancelling
previously queued/running static deploy runs and retiring this repository's
Cloudflare deploy credentials are separate release-operator steps.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
