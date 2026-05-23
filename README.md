# OSAM

Лендинг креативного агентства OSAM — статическая копия [osam.tilda.ws](https://osam.tilda.ws/).

- **Сайт:** https://osamdesign.com
- **Репозиторий:** https://github.com/ystas97/osam
- **GitHub Pages:** https://ystas97.github.io/osam/ (зеркало, если включено)

## Стек

HTML, CSS, JavaScript (без сборщика). Шрифт [Onest](https://fonts.google.com/specimen/Onest). Изображения — из исходного Tilda-проекта (в `assets/`).

## Локальный просмотр

```bash
cd osam
python3 -m http.server 8080
```

Откройте http://localhost:8080

## Структура

- `index.html` — одностраничный лендинг
- `css/style.css` — стили
- `js/main.js` — форма, часы (Belgrade), скролл хедера
- `assets/images/` — проекты и блок «What you get»
- `assets/icons/` — логотип, стрелки

## Форма → Telegram

Заявки уходят в Telegram через Cloudflare Worker (токен бота не в репозитории сайта).

Инструкция: [docs/telegram-form-setup.md](docs/telegram-form-setup.md)

Кратко: создать бота → задеплоить `workers/telegram-form` → указать URL в `js/site-config.js` (`contactFormUrl`).

Если `contactFormUrl` пустой, форма по-прежнему открывает `mailto:`.
