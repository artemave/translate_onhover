TRACKING_ID=1234

build: deps
	TRACKING_ID=$(TRACKING_ID) yarn build

deps: package.json
	yarn install
