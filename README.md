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

## Форма

Отправка открывает почтовый клиент (`mailto:`). Для продакшена можно подключить Formspree, Tally или свой backend.
