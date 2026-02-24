# Гид по навыку afina-module-builder-skill

Этот гид описывает, как использовать навык в переносимом формате без привязки к локальным путям.

## 1) Назначение навыка

Навык помогает создавать модули Afina 1.0.3 в формате:

- `settings.json`
- `index.js`
- `package.json`

Также навык соблюдает IPC-контракт (`ready/success/error`), строгие плейсхолдеры `${...}` и правила безопасной работы с Puppeteer.

## 2) Установка навыка

```bash
git clone https://github.com/YourNeighborZ/afina-module-builder-skill.git ".agents/skills/afina-module-builder-skill-repo"
```

Далее используйте файлы навыка из `.agents/skills/afina-module-builder-skill/` внутри репозитория.

## 3) Правило переносимости

- Не использовать machine-specific пути вида `E:\...`, `D:\...`, `C:\Users\...`.
- В документации и инструкциях использовать относительные пути от корня проекта/приложения.

## 4) Логи Afina при диагностике

- Afina создает лог в своей директории по относительному пути:
  - `data/logs/afina.log`
- Агент не должен пытаться самостоятельно искать локальную установку Afina.
- Если для диагностики нужны runtime-данные, агент запрашивает у пользователя:
  - либо файл `data/logs/afina.log`,
  - либо релевантный фрагмент лога.

Рекомендованный шаблон запроса:

"Пришлите, пожалуйста, файл лога Afina `data/logs/afina.log` (или фрагмент за время ошибки), чтобы точно локализовать причину."

## 5) Где смотреть основные правила

- Основная спецификация навыка: `.agents/skills/afina-module-builder-skill/SKILL.md`
- Технические шаблоны: `.agents/skills/afina-module-builder-skill/references/templates.md`
- Практики и анти-паттерны: `.agents/skills/afina-module-builder-skill/references/best-practices.md`
