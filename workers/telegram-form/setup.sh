#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f wrangler.toml ]]; then
  cp wrangler.toml.example wrangler.toml
  echo "Создан wrangler.toml — при необходимости отредактируйте ALLOWED_ORIGINS."
fi

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  read -r -s -p "TELEGRAM_BOT_TOKEN: " TELEGRAM_BOT_TOKEN
  echo
fi

if [[ -z "${TELEGRAM_CHAT_ID:-}" ]]; then
  echo "Напишите боту @osamdesignBot в Telegram, затем Enter."
  read -r -p "TELEGRAM_CHAT_ID: " TELEGRAM_CHAT_ID
fi

npm install
printf '%s' "$TELEGRAM_BOT_TOKEN" | npx wrangler secret put TELEGRAM_BOT_TOKEN
printf '%s' "$TELEGRAM_CHAT_ID" | npx wrangler secret put TELEGRAM_CHAT_ID
npx wrangler deploy

echo ""
echo "URL: https://osam-contact-telegram.osamdesign.workers.dev"
echo "Скопируйте в js/site-config.js → contactFormUrl"
echo "Если SSL-ошибка: в Dashboard → Workers → osam-contact-telegram включите workers.dev route."
