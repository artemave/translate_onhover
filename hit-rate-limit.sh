#!/usr/bin/env bash

for n in {1..100}; do echo "----------\n NUMBER $n\n"; curl -f -vvv 'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=bd&dj=1&source=input&q=language&sl=en&tl=fr' \
  -H 'authority: translate.googleapis.com' \
  -H 'accept: application/json, text/javascript, */*; q=0.01' \
  -H 'user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36' \
  -H 'sec-fetch-site: none' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-dest: empty' \
  -H 'accept-language: en-US,en;q=0.9' \
  --compressed || break; done
