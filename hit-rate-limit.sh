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

# for n in {1..2}; do echo "----------\n NUMBER $n\n"; curl 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&q=idea&sl=auto&tl=fr&tbb=1&ie=UTF-8&oe=UTF-8&hl=en' \
#   -H 'Connection: keep-alive' \
#   -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
#   -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36' \
#   -H 'Accept-Language: en-US,en;q=0.9,de;q=0.8,ru;q=0.7' \
#   -H 'Cookie: HSID=Aus6jMG2KWw68qUr6; APISID=rakXTCRzEXZ9p3Y7/AmfKu2kkmftxenPcf; SEARCH_SAMESITE=CgQIi5IB; SID=8wdkAkcDgozCh6I8kor2C5wvQ5vD58Uf5zxVUWH7Vl0BGpwxF09bMKv2lPWU7gXrUsf-og.; SIDCC=AJi4QfF2eA7J2Lu-0tTwx0TQHfwLg6YfBuB8xfoTN0n-jcLT6whSnkMf-fWoT72ONgWG22LKnv4' \
#   --insecure | jq || break; done
