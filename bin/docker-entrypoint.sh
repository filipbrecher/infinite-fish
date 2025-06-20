#!/bin/sh
npm install
npm run build
npm install -g serve
serve -s dist -l 8080