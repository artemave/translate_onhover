[![Chrome Web Store](https://img.shields.io/chrome-web-store/rating/aggiiclaiamajehmlfpkjmlbadmkledi.svg)]() [![License](http://img.shields.io/:license-mit-blue.svg)](http://artemave.mit-license.org)

Simply the best Google Chrome translation extension - https://chrome.google.com/webstore/detail/aggiiclaiamajehmlfpkjmlbadmkledi

### Run local version

You'll need a terminal and NodeJs. Then clone/download this repository.

In the project directory, install dependencies (run this in a terminal):

```bash
npm install -g yarn
yarn install
```

Then build:

```
yarn build
```

For Firefox build:

```
yarn build-ff
```

Now you can "Load unpacked" the `./dist` folder.

### Development

In addition to the above, there is `yarn dev`. For as long as it is running, `dist` will stay updated with code changes.
