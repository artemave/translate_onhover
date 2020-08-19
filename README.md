[![Chrome Web Store](https://img.shields.io/chrome-web-store/rating/aggiiclaiamajehmlfpkjmlbadmkledi.svg)]() [![License](http://img.shields.io/:license-mit-blue.svg)](http://artemave.mit-license.org)

Simply the best Google Chrome translation extension - https://chrome.google.com/webstore/detail/aggiiclaiamajehmlfpkjmlbadmkledi

### Development

You'll need Nodejs.

Install dependencies (run this in a terminal):

```bash
npm install -g yarn
yarn install
```

Then run `yarn dev` to start webpack compilation (in watch mode). You can then load `dist` directory as unpacked extension. For as long as `yarn dev` is running, `dist` will stay updated with code changes.
