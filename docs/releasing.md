# Releasing

1. Add an entry for the new version at the top of `CHANGELOG.md`:

   ```
   1.75
     * What changed
   ```

2. Run `yarn release 1.75` on a clean `master` (only `CHANGELOG.md` may be
   modified). It sets the version in both manifests, commits, tags `v1.75` and
   pushes.

3. The tag triggers the [Release workflow](../.github/workflows/release.yml):
   - checks the tag matches the manifest versions
   - runs the unit and e2e tests
   - builds the Chrome/Edge (MV3) and Firefox (MV2) zips, plus a source
     archive for Mozilla's review (the Firefox build is minified)
   - creates a GitHub release with the changelog entry and both zips
   - uploads to the Chrome Web Store, Firefox Add-ons and Edge Add-ons and
     submits each for review

Each store publishes the version once its review passes.

If a store upload fails, re-running the workflow doesn't help: the stores
that already accepted the version reject it a second time, and the GitHub
release already exists. Upload the zip from the GitHub release to the failed
store by hand.

## One-time setup

The workflow reads these [repository secrets](https://github.com/artemave/translate_onhover/settings/secrets/actions):

| Secret | What it is |
|---|---|
| `GA_API_SECRET`, `GA_MEASUREMENT_ID` | Google Analytics 4 Measurement Protocol credentials baked into the build (GA4 admin → Data streams → the stream → Measurement Protocol API secrets) |
| `CHROME_PUBLISHER_ID`, `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`, `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY` | Chrome Web Store API v2 access via a Google Cloud service account |
| `FIREFOX_JWT_ISSUER`, `FIREFOX_JWT_SECRET` | AMO API key ([addons.mozilla.org/developers/addon/api/key](https://addons.mozilla.org/developers/addon/api/key/)) |
| `EDGE_PRODUCT_ID`, `EDGE_CLIENT_ID`, `EDGE_API_KEY` | Edge Add-ons API credentials (Partner Center → Microsoft Edge → Publish API) |

`npx publish-extension init` walks through creating the store credentials
and saves them to `.env.submit` (gitignored), from where they can be copied
into the secrets. The Chrome extension id and Firefox add-on id aren't secret
and live in the workflow itself.

To check the store credentials, run the Release workflow by hand (Actions →
Release → Run workflow). That's a dry run: it builds and authenticates with
Chrome and Firefox but uploads nothing. Edge's dry run doesn't contact the
store, so Edge credentials are only exercised by a real release.
