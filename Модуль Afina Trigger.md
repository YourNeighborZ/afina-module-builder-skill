
Модуль **Afina Trigger** — это изолированный Node.js-скрипт, выполняющийся в отдельном процессе и управляемый системой **Triggers**.

---

Содержание

Последнее изменение

Oleksand

16.10.2025

# 🧩 Afina Trigger Module Development Guide

**Version:** 1.0  
**Updated:** October 2025  
**Author:** Afina Team

---

## 📖 Общее описание

Модуль **Afina Trigger** — это изолированный Node.js-скрипт, выполняющийся в отдельном процессе и управляемый системой **Triggers**.  
Он используется для автоматического анализа данных, подготовки аккаунтов, динамической подстановки переменных и запуска сценариев (**Scripts**) без участия пользователя.

> 💡 В отличие от обычных модулей сценариев, триггер-модули не являются частью цепочки Script и не запускаются вручную.  
> Они выполняются исключительно по расписанию (**cron**), заданному в настройках триггера.  
> Триггер-модуль может работать как с локальными данными, так и с внешними API, файлами, базами данных или Google Sheets — полностью автономно.

---

## ⚙️ Базовая структура триггер-модуля

```js
// Import utilities
const { delay, replacePlaceholders } = require('./utils_201.js');

// Main trigger module function
const moduleFunction = async (
  element,
  savedObjects,
  connections,
  elementMap,
  currentElementId,
  uuid,
  port,
  wsEndpoint
) => {
  const logger = {
    info: (msg) => process.send({ type: 'log', level: 'info', message: msg }),
    warn: (msg) => process.send({ type: 'log', level: 'warn', message: msg }),
    error: (msg) => process.send({ type: 'log', level: 'error', message: msg }),
  };

  logger.info("Trigger module started");

  // Example logic
  const data = { name: "PETR", isChecked: "1" };
  logger.info("Returning variable replacements...");

  return data;
};

// Message handler
process.on("message", async (msg) => {
  try {
    const result = await moduleFunction(
      msg.payload.element,
      msg.payload.savedObjects,
      msg.payload.connections,
      msg.payload.elementMap,
      msg.payload.currentElementId,
      msg.payload.uuid,
      msg.payload.port,
      msg.payload.wsEndpoint
    );
    process.send({ status: "success", result });
  } catch (err) {
    process.send({ status: "error", message: err.message });
  }
});

process.send({ status: "ready" });
```

---

## 🧠 Возврат результата

Триггер-модуль может возвращать результат в разных форматах, в зависимости от задач.

---

## 1️⃣ Проверка условия

```js
// Чтобы модуль понял, подходит ли условие под выполнение задачи,
// необходимо вернуть логический результат:

if (gwei < 20) {
  return { success: true };   // условие выполнено — можно запускать
} else {
  return { success: false };  // условие не выполнено — пропустить задачу
}
```

> 💡 Если возвращается { success: false }, триггер не активируется и задача не выполняется.

---

### 2️⃣ Простая строка

```js
return "OK";
```

Используется для простых проверок, где не требуется изменение переменных.  
В этом случае скрипт, указанный в настройках триггера, выполняется без изменений.

---

### 3️⃣ Замена переменных

```js
return {
  name: "PETR",
  isChecked: "1"
};
```

Все глобальные переменные, используемые в скрипте, будут заменены значениями из возвращённого объекта.  
Сам скрипт и аккаунты останутся теми, что указаны в настройках триггера.

---

### 4️⃣ Расширенный возврат (управление аккаунтами и скриптами)

```js
return {
  accounts: [
    {
      accountId: "d7a1a474-e951-432c-8cb0-9c0bba34910a",
      name: "PITER",
      isChecked: "1",
      success: true,
      scripts: [
        "1a3351c9-c9e7-49b3-b3b5-28b48006c2bd",
        "6c63e772-d1fb-4dca-858d-ba698a439607"
      ]
    },
    {
      accountId: "e32389d5-7d11-43d9-ba96-d7eb6aef023a",
      name: "PETR",
      isChecked: "0",
      success: true
    }
  ]
};
```

|Поле|Назначение|
|---|---|
|accountId|Уникальный ID аккаунта|
|name|Произвольная переменная|
|isChecked|Любые данные, заменяющие глобальные переменные|
|success|Обязательно true, если аккаунт готов к запуску|
|scripts|_(необязательно)_ массив ID-скриптов, которые нужно запустить|

> 💡 Если scripts не указаны — будет запущен базовый скрипт из настроек триггера.  
> Это позволяет строить сложные маршруты — разные скрипты для разных аккаунтов, динамические задачи из Google Sheets и т.п.

---

## 🌐 Подключение к браузеру (опционально)

Триггер-модули не получают готовый `wsEndpoint` от Afina.  
Если требуется работа с браузером, они должны самостоятельно запускать его с помощью **Puppeteer**, **Playwright** или **CDP**.

```js
const puppeteer = require("puppeteer");
const { delay } = require("./utils_201.js");

const moduleFunction = async () => {
  const logger = {
    info: (msg) => process.send({ type: 'log', level: 'info', message: msg }),
    error: (msg) => process.send({ type: 'log', level: 'error', message: msg }),
  };

  logger.info("Launching browser...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://example.com");
  await delay(2000);

  const cookies = await page.cookies();
  await browser.close();

  return { cookies };
};
```

⚙️ Таким образом, триггер полностью управляет жизненным циклом браузера — от запуска до закрытия.  
Он может использовать любые Node.js-библиотеки: **Puppeteer**, **Playwright**, **Selenium** и т.д.

---

## 💾 Автосохранение результата

В триггер-модулях не используется поле `saveTo`.  
Результаты выполнения не сохраняются автоматически — они передаются только в систему триггеров, которая решает, как обработать полученные данные.

---

## 🪵 Логирование

В триггер-модулях используется встроенный логгер,  
но в отличие от модулей сценариев, все логи записываются в отдельные файлы.

```js
logger.info("Checking new accounts...");
logger.warn("Network unstable, retrying...");
logger.error("API key invalid");
```

📁 Каждый запуск триггера создаёт отдельный лог-файл в каталоге `/logs/triggers/`,  
где можно просмотреть ход выполнения, ошибки и результаты.  
Рекомендуется логировать ключевые этапы выполнения.

---

## 🧩 Настройки модуля — settings.json

```json
{
  "fields": [
    { "name": "sourceType", "label": "Source Type", "type": "select", "default": "google", "options": ["google", "api", "local"] },
    { "name": "sheetUrl", "label": "Google Sheet URL", "type": "text", "isVisible": "sourceType === 'google'" },
    { "name": "apiUrl", "label": "API Endpoint", "type": "text", "isVisible": "sourceType === 'api'" },
    { "name": "timeout", "label": "Timeout (ms)", "type": "number", "default": 5000 }
  ]
}
```

Все поля поддерживают `isVisible`, `default`, `options` и логические выражения для динамического отображения.

---

## 🧰 Подключение сторонних библиотек

Триггер-модули — полноценные Node.js-скрипты.  
Можно подключать любые пакеты и библиотеки:

- 🧭 **CDP (Chrome DevTools Protocol)**
- 🎭 **Playwright**
- 🧠 **Selenium**
- 🌐 **Axios / node-fetch**
- 🔄 **Crypto / fs / path / cheerio / puppeteer-extra**

**Пример:**

```js
const axios = require('axios');
const res = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
logger.info("BTC price: " + res.data.price);
return { price: res.data.price };
```

---

## 📁 Рекомендуемая структура папки модуля

```none
my-trigger-module/
├── index.js           # основной код триггера
├── settings.json      # конфигурация параметров
├── utils_201.js       # утилиты Afina
├── package.json       # зависимости
└── helpers/
    └── parser.js      # вспомогательные функции
```

---

## ✅ Советы и лучшие практики

- Добавляйте `default` во все поля `settings.json`.
- Не используйте `saveTo` — результаты обрабатывает только система триггеров.
- Проверяйте наличие нужных данных перед возвратом (`success: true`).
- Логируйте ключевые шаги в каждом модуле.
- Для сложных сценариев используйте API, базы данных, Google Sheets.
- Можно комбинировать несколько подходов — собирать данные, фильтровать аккаунты, назначать скрипты.
- Каждый модуль изолирован и может использовать любые NPM-пакеты.
- Планирование выполнения всегда происходит по cron, запуск вручную невозможен.

---

## 🚀 Пример: обработка задач из Google Sheets

```js
const axios = require("axios");

const moduleFunction = async () => {
  const sheet = await axios.get("https://sheet.afina.io/data.json");
  const rows = sheet.data.slice(0, 3);

  const accounts = rows.map((r) => ({
    accountId: r.id,
    name: r.name,
    isChecked: "1",
    success: true,
    scripts: [r.scriptId],
  }));

  return { accounts };
};
```

Такой модуль может регулярно опрашивать таблицу, формировать задания для аккаунтов и запускать соответствующие скрипты по расписанию.