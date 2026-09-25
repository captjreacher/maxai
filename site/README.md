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

## Catalogue-triggered production build

Billing is the commercial source of truth. After a committed public
MaximisedAI product/plan change or price publication, the Billing API sends the
`billing-maxai-catalogue-published` repository dispatch. The
`Deploy MaxAI Static Site` workflow runs the site tests, performs a required
build-time catalogue read, checks that secret material is absent from `dist/`,
and deploys `dist/` to the existing `maxai` Cloudflare Worker as Static
Assets. The workflow can also be started manually with `workflow_dispatch`.

Configure these as GitHub Actions repository or environment secrets:

- `MAXAI_BILLING_CATALOGUE_API_BASE_URL`
- `MAXAI_BILLING_CATALOGUE_API_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

`MAXAI_BILLING_CATALOGUE_API_KEY` must be a Billing API key whose hash is
configured on Billing with `ADMIN_API_KEY_ROLES=runtime.viewer`. Do not store
Billing's `ADMIN_AUTH_SIGNING_KEY_B64` in this repository.

The Wrangler configuration intentionally contains no `route` or `routes`.
Binding `maximisedai.com` and changing DNS are separate, explicitly approved
cutover actions.
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
