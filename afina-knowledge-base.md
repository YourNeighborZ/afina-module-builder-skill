# 📘 Afina Anti-Detect Browser — База знаний для AI

> **Версия:** 1.0 | **Совместимость:** Afina 2.1 | **Язык:** Русский
> Этот документ является живой базой знаний. Обновляется по мере накопления информации о продукте.

## Навигация по базе

- 🔌 Основной API-контракт: [[afina-api]]
- 🧭 Единая точка входа по Afina: этот документ

> [!tip] Как использовать
> Начинай с этого документа как с главного индекса, а за API-деталями переходи в [[afina-api]].

---

## 📌 РАЗДЕЛ 1. ЧТО ТАКОЕ AFINA

Afina Anti-Detect Browser — это **программная платформа для автоматизации действий в браузере** с централизованным управлением профилями, задачами и сценариями. Это не просто антидетект-браузер, а полноценная RPA-платформа (Robotic Process Automation).

### 🎯 Краткое позиционирование

Afina закрывает полный внешний контур браузерной автоматизации:

- анти-детект профильный слой;
- модульная автоматизация на Node.js;
- API-управление и task-оркестрация;
- trigger-автоматизация для регулярных процессов.

Итог: продукт работает как операционная среда автоматизации, а не только как браузер.

### 🧩 Ключевые составляющие продукта

| Компонент | Описание |
|---|---|
| **Браузерные профили** | Изолированные окружения с отдельными параметрами (fingerprint, прокси, timezone) |
| **Scripts (Сценарии)** | Визуальные графы автоматизации, собираемые из блоков-модулей |
| **Task Groups / Tasks** | Система оркестрации — группы задач, задачи, расписания |
| **Trigger-модули** | Автозапуск по cron без ручного старта |
| **HTTP API** | Локальный API для внешнего управления всем продуктом |

### ⚙️ Технологическая база

- **Ядро браузера:** Chromium
- **Автоматизация:** Puppeteer / Playwright / CDP
- **Модули:** Node.js (CommonJS)
- **Коммуникация с ядром:** IPC (Inter-Process Communication через `process.send`)
- **API:** REST HTTP, локальный (`http://127.0.0.1:{port}`)

---

## 📌 РАЗДЕЛ 2. АРХИТЕКТУРА СЦЕНАРИЕВ

### 2.1 Структура сценария (Script)

Сценарий в Afina — это **визуальный граф** из блоков, соединённых стрелками. Каждый блок — это **модуль** (Node.js-процесс), который:

1. Получает данные на вход (`savedObjects`, `element.settings`)
2. Выполняет задачу
3. Сохраняет результат в `savedObjects[saveTo]`

Редактор сценариев — **визуальное полотно** (canvas). Блоки перетаскиваются и соединяются. Каждый блок имеет свои настройки, которые задаются через UI-конструктор.

### 2.2 Тип блока `executeModule`

Кастомный блок называется `executeModule`. Это "чёрный ящик" — пользователь создаёт свой модуль и импортирует его в Afina.

### 2.3 Встроенные блоки (примеры из документации)

- **click** — клик по элементу (поддерживает XPath, CSS, savedObject)
- **iframe** — переключение контекста на iframe, с сохранением пути к элементу в объект
- Другие встроенные блоки присутствуют в интерфейсе редактора скриптов

---

## 📌 РАЗДЕЛ 3. МОДУЛИ AFINA (КАСТОМНЫЕ БЛОКИ)

### 3.1 Структура модуля

Каждый кастомный модуль состоит из **трёх файлов**:

```
my-module/
├── settings.json   # Описание UI-настроек блока для конструктора
├── index.js        # Логика модуля (Node.js)
└── package.json    # Зависимости npm
```

### 3.2 Файл `settings.json`

Описывает поля, которые пользователь видит в конструкторе при настройке блока.

```json
{
  "type": "Название типа блока",
  "fields": [
    {
      "name": "inputText",        // camelCase — имя поля, читается в коде как element.settings.inputText
      "label": "Метка в UI",      // Текст, который видит пользователь
      "type": "text",             // Тип поля: text | select | checkbox | number | ...
      "default": "",              // Значение по умолчанию
      "loadTo": true              // true = поле поддерживает подстановку переменных ${var}
    },
    {
      "name": "saveTo",
      "label": "Сохранить результат в переменную",
      "type": "text",
      "default": ""
    }
  ]
}
```

#### Расширенный синтаксис `settings.json`

**Выпадающий список (`select`):**
```json
{
  "name": "actionType",
  "type": "select",
  "options": [
    { "label": "Запуск", "value": "start" },
    { "label": "Остановка", "value": "stop" }
  ]
}
```

**Условная видимость поля (`isVisible`):**
```json
{
  "name": "delayMs",
  "isVisible": "actionType === 'start'"
}
```
Поле видно только если в поле `actionType` выбрано значение `'start'`. Синтаксис — строковое JS-выражение.

**Группировка полей (`groupId`):**
```json
{ "groupId": "settings" }
{ "groupId": "output" }
```

### 3.3 Файл `index.js` — эталонный шаблон

Полный IPC-safe шаблон с обязательными глобальными обработчиками:

```javascript
const replacePlaceholders = (value, savedObjects) => {
  if (typeof value !== "string") return value;
  return value.replace(/\$\{([^}]+)\}/g, (_, variable) => {
    const key = String(variable || "").trim();
    const replacement = savedObjects && key in savedObjects ? savedObjects[key] : "";
    return replacement === undefined || replacement === null ? "" : String(replacement);
  });
};

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
    info: (message) => process.send?.({ type: "log", level: "info", message }),
    warn: (message) => process.send?.({ type: "log", level: "warn", message }),
    error: (message) => process.send?.({ type: "log", level: "error", message })
  };

  try {
    const settings = element?.settings || {};
    const inputText = replacePlaceholders(settings.inputText ?? "", savedObjects);
    const saveTo = replacePlaceholders(settings.saveTo ?? "", savedObjects);

    // === БИЗНЕС-ЛОГИКА ЗДЕСЬ ===
    const result = String(inputText).trim();
    // ===========================

    if (saveTo && savedObjects && typeof savedObjects === "object") {
      savedObjects[saveTo] = result;
    }

    return result;
  } catch (error) {
    logger.error(`Ошибка модуля: ${error.message}`);
    throw error;
  }
};

process.on("message", async (msg) => {
  try {
    const result = await moduleFunction(
      msg.payload.element, msg.payload.savedObjects, msg.payload.connections,
      msg.payload.elementMap, msg.payload.currentElementId,
      msg.payload.uuid, msg.payload.port, msg.payload.wsEndpoint
    );
    process.send?.({ status: "success", result });
  } catch (err) {
    process.send?.({ status: "error", message: err.message, stack: err.stack });
  }
});

// ОБЯЗАТЕЛЬНО: 3 глобальных обработчика
process.on("uncaughtException", (err) => {
  try { process.send?.({ status: "error", message: `Uncaught Exception: ${err.message}` }); } catch (_) {}
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  try { process.send?.({ status: "error", message: `Unhandled Rejection: ${reason}` }); } catch (_) {}
  process.exit(1);
});
process.on("disconnect", () => { process.exit(0); });

if (typeof process.send === "function") {
  process.send({ status: "ready" });
}
```

---

## 📌 РАЗДЕЛ 4. АКСИОМЫ И ЖЁСТКИЕ ПРАВИЛА

Это правила, нарушение которых ломает продукт. Обязательны к соблюдению.

### Аксиома 1 — Единство настроек
Все поля из `settings.json` читаются в коде **строго** через `element.settings.<name>`.
❌ Нельзя читать из других источников.

### Аксиома 2 — Изоляция модуля
Модуль полностью автономен. Все зависимости описаны в `package.json`.

### Аксиома 3 — Ресурсы
Браузер (`puppeteer`) поднимается **только** если нужен реальный DOM (клики, iframe, рендеринг).
Для API-запросов, парсинга, вычислений — достаточно чистого Node.js.

### Аксиома 4 — IPC-ядро
Блок `process.on("message")` неприкосновенен. **Обязательны** 3 глобальных обработчика:
- `uncaughtException`
- `unhandledRejection`
- `disconnect`
Их отсутствие приводит к зависшим зомби-процессам в ОС.

### Аксиома 5 — Активная вкладка
**Никогда** не использовать `browser.pages()[0]` вслепую — это может быть фоновая вкладка расширения (`offscreen.html`, `about:blank`).
Всегда использовать `getCurrentPage()` из файла `utils.js`.

---

## 📌 РАЗДЕЛ 5. ПАТТЕРНЫ PUPPETEER В AFINA

### 5.1 `utils.js` — обязательный файл для браузерных модулей

Для **всех** модулей, работающих с браузером, обязателен отдельный файл `utils.js` с функцией `getCurrentPage`. Она отфильтровывает служебные страницы и проверяет видимость вкладки через `!document.hidden`.

Для чисто Node.js модулей `utils.js` не нужен — вспомогательные функции держатся в `index.js`.

### 5.2 Надёжные ожидания (Waits)

```javascript
// Для тяжёлых страниц — ждать сетевой тишины
await page.waitForNavigation({ waitUntil: 'networkidle2' });

// Ждать появления элемента
await page.waitForSelector('.my-class', { visible: true });

// Ждать состояния JS
await page.waitForFunction('document.readyState === "complete"');
```
❌ Жёсткие `setTimeout` — только как fallback, не как основной подход.

### 5.3 Безопасный `evaluate`

```javascript
// ✅ Правильно — переменные передаются как аргументы
await page.evaluate((val) => document.title = val, myValue);

// ❌ Неправильно — склеивание строк
await page.evaluate(`document.title = "${myValue}"`);
```

### 5.4 Работа с iframe

```javascript
// Найти нужный frame по URL
const frame = page.frames().find(f => f.url().includes('login'));
```

### 5.5 Shadow DOM

XPath и обычные CSS-селекторы не проникают в Shadow DOM (`#shadow-root`). Нужно использовать встроенный блок Afina или пробивающие селекторы Puppeteer (`>>>`).

### 5.6 Human-like взаимодействие (анти-бот)

```javascript
// Случайная задержка при вводе — защита от Cloudflare и антифрод-систем
await page.type('#input', text, { delay: Math.floor(Math.random() * 50) + 50 });
```

### 5.7 Безопасное отключение от браузера

```javascript
// ✅ Правильно — отключиться, не убивать процесс
await browser.disconnect();

// ❌ Неправильно — убивает весь процесс браузера вместе со сценарием Afina
await browser.close();
```

### 5.8 Борьба с гонкой данных (React/Vue)

При отслеживании DOM через `MutationObserver` контейнеры могут появиться пустыми, а текст подгружается асинхронно.

```javascript
// ✅ Правильно — не помечать элемент обработанным, пока нет текста
if (!el.innerText.trim()) return;

// ❌ Неправильно — помечаем до появления данных, пропускаем реальный контент
el.setAttribute('data-counted', 'true');
```

### 5.9 Таймауты с `Promise.race`

```javascript
const withTimeout = (promise, timeoutMs, message) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs))
]);
```
Не используй один глобальный таймаут на весь модуль — разбивай ожидание по шагам.

---

## 📌 РАЗДЕЛ 6. РАБОТА С ПЕРЕМЕННЫМИ

### 6.1 Формат плейсхолдеров

В Afina используется **единственный** формат подстановки переменных: `${varName}`

```javascript
// ✅ Правильно
const value = replacePlaceholders("${myVar}", savedObjects);

// ❌ Запрещено — формат {{var}} не поддерживается
const value = "{{myVar}}";
```

### 6.2 Как работает `replacePlaceholders`

Функция заменяет `${key}` на значение из объекта `savedObjects[key]`.
- Если ключ не найден — подставляется пустая строка
- `null` и `undefined` → пустая строка
- Не-строковые значения приводятся к строке через `String()`

### 6.3 Поле `loadTo: true`

В `settings.json` поля с `"loadTo": true` означают, что пользователь может вставить туда переменную `${var}`. Эти поля **обязательно** обрабатываются через `replacePlaceholders()` в коде.

### 6.4 Объект `savedObjects`

`savedObjects` — это общий контекст данных, который передаётся между блоками сценария. Модуль читает из него и пишет в него:

```javascript
// Чтение
const myValue = savedObjects['someKey'];

// Запись результата
if (saveTo && savedObjects && typeof savedObjects === "object") {
  savedObjects[saveTo] = result;
}
```

---

## 📌 РАЗДЕЛ 7. IPC-ЖИЗНЕННЫЙ ЦИКЛ МОДУЛЯ

Каждый модуль общается с ядром Afina через IPC-сообщения:

| Статус | Когда отправляется |
|---|---|
| `{ status: "ready" }` | При старте модуля (самое первое сообщение) |
| `{ status: "success", result }` | После успешного выполнения |
| `{ status: "error", message, stack }` | При любой ошибке |
| `{ type: "log", level: "info/warn/error", message }` | Логирование |

---

## 📌 РАЗДЕЛ 8. XPATH В AFINA

Afina использует Puppeteer-методы для поиска элементов по XPath:
- `page.$x(xpath)`
- `page.waitForXPath(xpath)`

### 8.1 Правила генерации XPath

| Правило | Пример |
|---|---|
| Только относительные пути | `//div[@class]` ❌ `/html/body/div` |
| Двойные кавычки в атрибутах | `@attr="value"` |
| Классы через `contains` | `contains(@class, "btn")` ❌ `@class="btn"` |
| Индексация с 1 | `//div[1]` ❌ `//div[0]` |
| Только XPath 1.0 | Запрещены `fn:matches()` и XPath 2.0 |
| Приоритет атрибутов | `data-testid > aria-label > role > id > class` |
| Длина выражения | Не более 80 символов — иначе разбить |

### 8.2 Три группы XPath по надёжности

**Группа 1 — По уникальным атрибутам** (наиболее стабильные)
- `data-testid`, `aria-label`, `role`, `id`
- Пример: `//button[@data-testid="submit-btn"]`

**Группа 2 — По структуре без текста** (средняя стабильность)
- Позиционные, по тегу и классу
- Пример: `//div[contains(@class, "form")]//input[2]`

**Группа 3 — Через родительский элемент** (контекстные)
- Когда элемент неуникален сам по себе
- Пример: `//section[@id="login"]//button`

### 8.3 Особые ситуации

**iFrame:** XPath не работает без переключения контекста. В Afina есть встроенный блок `iframe` — он сохраняет путь к элементу внутри фрейма в объект. Впоследствии вместо XPath подставляется этот объект.

**Shadow DOM:** XPath не проникает в `#shadow-root`. Нужен встроенный блок Afina или метод через `evaluate`.

**Aria-label со скобками:** Использовать `contains()`:
```xpath
//button[contains(@aria-label, "Notifications (3)")]
```

### 8.4 Канонический формат ответа XPath-ассистента

При работе в режиме XPath-помощника ответ строится в трех группах:

1. Группа 1 - по уникальным атрибутам.
2. Группа 2 - по структуре без текста.
3. Группа 3 - через родительский элемент.

После групп обязательно идут:

- рекомендации по выбору лучшего варианта;
- предупреждения о нестабильных XPath;
- следующий шаг (что нужно прислать, если данных недостаточно).

### 8.5 Диагностика проблем XPath

Если XPath нестабилен или не работает:

1. Запросить HTML родителя на 1-2 уровня выше.
2. Проверить наличие `iframe`.
3. Проверить наличие `#shadow-root`.

Ограничения среды:

- внутри `iframe` нужен предварительный переход контекста через блок `iframe`;
- XPath не проникает в Shadow DOM, нужен встроенный механизм Afina или альтернативный подход через browser-context логику.

---

## 📌 РАЗДЕЛ 9. API AFINA

### 9.1 Общее

- Локальный HTTP API: `http://127.0.0.1:{port}`
- Большинство эндпоинтов защищены заголовком `X-API-Key`
- Полная спецификация эндпоинтов и примеры: [[afina-api]]

### 9.2 Известные эндпоинты

| Эндпоинт | Описание |
|---|---|
| `GET /api/health` | Проверка состояния системы |
| Профили | Создание, запуск, остановка, список, статус `isRunning` |
| Скрипты | Управление сценариями |
| Task Groups | Управление группами задач |
| Tasks | Создание и управление задачами |
| Логи задач | Получение логов исполнения |

### 9.3 Принцип ссылочного API-контракта

- В этом документе хранится архитектурная модель API (что и зачем).
- Детальные request/response, ошибки и параметры хранятся только в [[afina-api]].
- При изменении API сначала обновляется [[afina-api]], затем синхронизируется этот раздел.

---

## 📌 РАЗДЕЛ 10. ПРОФИЛИ (БРАУЗЕРНЫЕ ИДЕНТИЧНОСТИ)

Профиль в Afina — это отдельная браузерная идентичность для использования в автоматизации как рабочий аккаунт.

### Настраиваемые параметры профиля

- ОС и версия Chromium
- Прокси
- Языки
- Timezone
- Группы и теги

### Управление через API

- Создание профилей
- Запуск / остановка
- Получение списка и статуса `isRunning`

---

## 📌 РАЗДЕЛ 11. ЗАДАЧИ (TASKS) И ОРКЕСТРАЦИЯ

### 11.1 Модель выполнения

```
Task Group → Task → Script + Profile
```

- **Task Group** — логическая группировка задач
- **Task** — запуск конкретного скрипта на конкретном профиле/аккаунте

### 11.2 Статусы задач

| Статус | Значение |
|---|---|
| `waiting` | Ожидает выполнения |
| `working` | Выполняется |
| `finished` | Завершена успешно |
| `error` | Завершена с ошибкой |

### 11.3 Варианты запуска

- Без расписания (ручной или API-запуск)
- По окну времени — `schedule`
- По часовым границам — `scheduleTime`

---

## 📌 РАЗДЕЛ 12. TRIGGER-МОДУЛИ (АВТОЗАПУСК)

Trigger — отдельный механизм для запуска Node.js-модулей **автоматически по cron**, без ручного старта.

### Особенности

- Модуль выполняется как изолированный процесс
- Может возвращать:
  - Условия запуска
  - Данные для подстановки переменных
  - Расширенные маршруты по аккаунтам/скриптам
- Может работать с внешними источниками (API, БД, Google Sheets) автономно
- Ведёт отдельные лог-файлы запусков

---

## 📌 РАЗДЕЛ 13. АНТИПАТТЕРНЫ (ЧТО НЕЛЬЗЯ ДЕЛАТЬ)

| Антипаттерн | Последствие |
|---|---|
| Читать поля не из `element.settings` | Модуль не видит данные из конструктора |
| Переименовывать `saveTo` в `save_to` без обновления логики | Потеря результата |
| Использовать формат `{{var}}` вместо `${var}` | Ошибка конфигурации, переменная не подставляется |
| Принудительно ставить `"type": "module"` в рабочем модуле | Риск поломки UX и категоризации |
| Удалять `loadTo: true` без проверки совместимости ядра | Несовместимость с версией |
| Использовать `browser.pages()[0]` | Подхват фоновой вкладки расширения |
| Использовать `browser.close()` | Убивает весь процесс браузера |
| Не добавлять 3 глобальных обработчика | Зомби-процессы в ОС |
| Использовать браузер для задач, решаемых Node.js | Избыточное потребление ресурсов |
| Использовать абсолютные XPath | Хрупкость при изменении DOM |
| Использовать CSS-селекторы вместо XPath в XPath-полях | Несовместимость с `page.$x()` |

---

## 📌 РАЗДЕЛ 14. ЧЕКЛИСТ ГОТОВНОСТИ МОДУЛЯ

- [ ] Все `name` из `settings.json` совпадают с путями в JS (`element.settings.<name>`)
- [ ] Переменные с `loadTo: true` пропущены через `replacePlaceholders()` в формате `${...}`
- [ ] В `index.js` добавлены 3 глобальных слушателя: `uncaughtException`, `unhandledRejection`, `disconnect`
- [ ] Если используется Puppeteer: браузер отключается через `browser.disconnect()`, не `browser.close()`
- [ ] Если используется Puppeteer: есть файл `utils.js` с `getCurrentPage()`
- [ ] Модуль отправляет `{ status: "ready" }` при старте
- [ ] Модуль возвращает `{ status: "success", result }` или `{ status: "error" }`
- [ ] `package.json` содержит все зависимости

---

## 📌 РАЗДЕЛ 15. ИНТЕГРАЦИИ

Afina поддерживает интеграцию с:
- Внешними REST API
- Базами данных
- Файловой системой
- Google Sheets
- Любыми npm-библиотеками

Всё это доступно внутри модульных блоков как обычный Node.js-код.

---

## 🔄 ИСТОРИЯ ОБНОВЛЕНИЙ

| Версия | Дата | Изменения |
|---|---|---|
| 1.0 | 2026-03 | Первичная сборка базы знаний из 6 исходных файлов |

---

*Следующий шаг: добавить примеры реальных модулей (примеры из папок `01_minimal-node`, `02_browser-puppeteer`, `03_settings-fix-from-nousresearch`).*
