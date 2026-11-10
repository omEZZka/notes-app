# Заметки (Notes)

Приложение заметок: React + TypeScript + Vite, упакованное как single-file HTML и обёрнутое в нативный Android APK (WebView).

## Возможности

- Создание, редактирование, удаление заметок с автосохранением (debounce, настраиваемый интервал)
- Папки (создание, переименование, цвет, счётчики) и теги (автоподхват `#тег` из текста + ручные чипы)
- Мгновенный полнотекстовый поиск по заголовку, тексту и тегам с подсветкой совпадений
- Избранное, закрепление, архив, корзина с Undo и автоочисткой через 30 дней
- Тёмная / светлая / системная тема, режимы «плитка» и «список», сортировки и toggle-фильтры
- Экспорт в JSON / Markdown / TXT, импорт JSON-бэкапа (валидация через zod)
- Статистика: заметки, слова, символы, разбивка по папкам и тегам
- Горячие клавиши: Ctrl/Cmd+N (новая), Ctrl/Cmd+F (поиск), Ctrl/Cmd+S (сохранение), Esc (закрыть)
- Адаптивный интерфейс от 360 px, IndexedDB-персистентность

## Структура

```
web/       — React-приложение (src, vite.config.ts, tsconfig.json)
android/   — WebView-обёртка: MainActivity.java, ресурсы, build.sh
.github/workflows/build-apk.yml — сборка APK в CI
```

## Сборка веб-части

```bash
cd web
npm ci
npm run build      # -> web/dist/index.html (один самодостаточный файл)
npm test           # vitest: 116 тестов
```

## Сборка APK локально

Нужны JDK 17, Android SDK (build-tools 34.0.0, platform android-34).

```bash
cd android
WEB_DIST=../web/dist bash build.sh
# -> android/build/apk/notes.apk (подписан debug-ключом)
```

## Сборка в CI

Push в `main` запускает workflow: сборка веба → сборка APK → загрузка артефакта `notes-apk`.
Тег `v*` дополнительно создаёт GitHub Release с APK.

## Установка

```bash
adb install -r notes.apk
```
