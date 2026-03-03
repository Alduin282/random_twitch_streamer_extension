# 🎲 Twitch Random Streamer

Chrome-расширение, которое открывает **случайного стримера** на Twitch по заданным фильтрам.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blueviolet)
![Chrome](https://img.shields.io/badge/Browser-Chrome%20%7C%20Edge%20%7C%20Brave-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Возможности

- **Язык стрима** — русский, английский, и другие (по умолчанию: русский)
- **Количество зрителей** — меньше или больше заданного порога (по умолчанию: < 10)
- **Категория** — с автодополнением из Twitch API (по умолчанию: Just Chatting)
- Тёмная тема в стиле Twitch с анимациями

---

## 📦 Установка

### 1. Получите Twitch API ключи

1. Перейдите на [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
2. Нажмите **Register Your Application**
3. Заполните:
   - **Name** — любое (например `RandomStreamer`)
   - **OAuth Redirect URLs** — `http://localhost`
   - **Category** — `Browser Extension`
4. Нажмите **Create** → откройте созданное приложение
5. Скопируйте **Client ID** и сгенерируйте **Client Secret**

### 2. Установите расширение

1. Скачайте или склонируйте этот репозиторий:
   ```bash
   git clone https://github.com/Alduin282/random_twitch_streamer_extension.git
   ```
2. Откройте в браузере `chrome://extensions`
3. Включите **Developer mode** (переключатель в правом верхнем углу)
4. Нажмите **Load unpacked** → выберите папку с расширением

### 3. Введите API ключи

1. Нажмите на иконку расширения в тулбаре
2. Нажмите ⚙ (шестерёнку) в правом верхнем углу
3. Вставьте **Client ID** и **Client Secret**
4. Нажмите **Сохранить**

---

## 🚀 Использование

1. Нажмите на иконку расширения
2. Настройте фильтры (или оставьте значения по умолчанию):
   - **Язык** — русский
   - **Зрители** — меньше 10
   - **Категория** — Just Chatting
3. Нажмите **🎲 Рандом!**
4. Текущая вкладка откроет стрим случайного стримера

---

## 🗂 Структура проекта

```
├── manifest.json      # Конфигурация расширения (Manifest V3)
├── popup.html         # UI попапа
├── popup.css          # Стили (тёмная тема Twitch)
├── popup.js           # Логика попапа
├── background.js      # Service worker (Twitch API)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🛡 Безопасность

Ваши Client ID и Client Secret хранятся **локально** в `chrome.storage.local` и никуда не отправляются, кроме серверов Twitch для авторизации.

---

## 📄 Лицензия

MIT
