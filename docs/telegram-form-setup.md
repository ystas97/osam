# Форма → Telegram

Токен бота хранится только в Cloudflare Worker, не в коде сайта.

**Важно:** не публикуйте токен в чатах и не коммитьте в git. Если токен засветился — в [@BotFather](https://t.me/BotFather) выполните `/revoke` и создайте новый.

## 1. Telegram-бот

Бот: [@osamdesignBot](https://t.me/osamdesignBot)

1. Токен от BotFather — только для `wrangler secret put`, не в репозиторий.
2. Напишите [@osamdesignBot](https://t.me/osamdesignBot) любое сообщение (например «Привет»).
3. Узнайте **chat_id**:
   - откройте в браузере `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - найдите `"chat":{"id":123456789` — это ваш `TELEGRAM_CHAT_ID`

Для группы: добавьте бота в группу, напишите в группе, снова откройте `getUpdates`.

## 2. Cloudflare Worker

```bash
cd workers/telegram-form
npx wrangler login
./setup.sh
```

Или вручную: `cp wrangler.toml.example wrangler.toml`, затем `npm install`, секреты и `npm run deploy`.

Скопируйте URL вида `https://osam-contact-telegram.xxx.workers.dev`.

## 3. Сайт

```bash
cp js/site-config.example.js js/site-config.js
```

В `js/site-config.js` вставьте URL Worker в `contactFormUrl`.

Закоммитьте `site-config.js` с URL (это не секрет) или держите локально — как удобно.

## 4. Проверка

1. Локально: `python3 -m http.server 8080`
2. Заполните форму на `#contact` → SEND
3. Сообщение должно прийти в Telegram

Если `contactFormUrl` пустой — форма откроет почтовый клиент (`mailto:`), как раньше.

## 5. Отдельный чат для вакансий (необязательно)

Заказы (форма Book a call) и отклики (форма Career) приходят с разными
заголовками: «💼 ЗАКАЗ» и «👤 ВАКАНСИЯ». Чтобы вакансии не мешали заказам,
отправьте их в отдельное место:

1. Создайте группу или канал, добавьте бота (для канала — администратором).
2. Узнайте `chat_id` через `getUpdates`, как в п. 1 (у групп он начинается с `-100…`).
3. Сохраните секрет и задеплойте Worker:

```bash
cd workers/telegram-form
npx wrangler secret put TELEGRAM_CAREER_CHAT_ID
npm run deploy
```

Если вместо новой группы нужна тема в уже существующей группе с включёнными
topics — добавьте ещё `TELEGRAM_CAREER_THREAD_ID` (id темы виден в
`message_thread_id` в `getUpdates`). Пока секреты не заданы, всё приходит в
`TELEGRAM_CHAT_ID`, как раньше.
