#!/bin/sh
# Ping IndexNow (Bing, Yandex, Seznam, Naver…) with every URL in sitemap.xml.
# Run from the site root after pushing changes:  sh _build/indexnow.sh
KEY=dfa40bd7ef391da6f607c6b595bb4124
URLS=$(grep -o '<loc>[^<]*' sitemap.xml | sed 's/<loc>//' | sed 's/.*/"&"/' | paste -sd, -)
curl -s -o /dev/null -w "IndexNow HTTP %{http_code}\n" -H 'Content-Type: application/json; charset=utf-8' \
  -d "{\"host\":\"walksandquests.com\",\"key\":\"$KEY\",\"keyLocation\":\"https://walksandquests.com/$KEY.txt\",\"urlList\":[$URLS]}" \
  https://api.indexnow.org/indexnow
