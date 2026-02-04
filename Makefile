.PHONY: install build test test-watch lint lint-fix clean check

install:
	npm install

build:
	npm run build

test:
	npm test

test-watch:
	npm run test:watch

lint:
	npm run lint

lint-fix:
	npm run lint:fix

clean:
	rm -rf dist

check: lint build test
