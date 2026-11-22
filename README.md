[![Chrome Web Store](https://img.shields.io/chrome-web-store/rating/aggiiclaiamajehmlfpkjmlbadmkledi.svg)]() [![License](http://img.shields.io/:license-mit-blue.svg)](http://artemave.mit-license.org) [![Test endpoints](https://github.com/artemave/translate_onhover/actions/workflows/test_endpoints.yml/badge.svg)](https://github.com/artemave/translate_onhover/actions/workflows/test_endpoints.yml)

Simply the best Google Chrome translation extension - https://chrome.google.com/webstore/detail/aggiiclaiamajehmlfpkjmlbadmkledi

Firefox version: https://addons.mozilla.org/firefox/addon/transover-ff/

Edge version: https://microsoftedge.microsoft.com/addons/detail/transover/jocggnbbgpaaphngnlccmhgbjffgnjda

### Run local version

You'll need a terminal and NodeJs. Then clone/download this repository.

In the project directory, install dependencies (run this in a terminal):

```bash
npm install -g yarn
yarn install
```

Then build:

```
TRACKING_ID=1234 yarn build
```


Where TRACKING\_ID is some Google Analitycs tracking id.

Now you can "Load unpacked" the `./dist` folder.

### Development

In addition to the above, there is `yarn dev`. For as long as it is running, `dist` will stay updated with code changes.

`yarn browser` (Chromium) and `yarn browser:firefox` open a browser with the extension loaded, rebuild on code changes and reload the extension after each rebuild. Open tabs need a reload to pick up content script changes. They open example.com, or the URLs given as arguments, e.g. `yarn browser https://mail.google.com`. Each browser keeps its profile in `.browser-profile/` and builds into `.dev-build/`, so both can run at once, alongside `yarn dev` or the tests.
