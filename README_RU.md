# afina-module-builder-skill

Навык для проектирования и сборки модулей Afina 1.0.3 в формате `settings.json` + `index.js` + `package.json`.

## Что делает навык

- задает единый стандарт структуры модуля и настроек;
- помогает корректно читать параметры через `element.settings.<name>`;
- сохраняет IPC-совместимость (`ready/success/error`) и безопасное завершение процесса;
- закрепляет строгий формат плейсхолдеров `${...}` и контракт бизнес-результата;
- дает готовые шаблоны и рабочие примеры для Node.js и Puppeteer-сценариев.

## Для чего предназначен

Используйте навык, когда в сценарии Afina нужен кастомный `executeModule`-блок с предсказуемым поведением, стабильной обработкой ошибок и быстрым стартом разработки.

## Бонусы при разработке

- меньше ручной рутины и меньше ошибок в базовом каркасе;
- быстрее запуск новых модулей за счет шаблонов;
- единообразный стиль модулей в команде;
- меньше регрессий благодаря встроенным best practices.

## Установка в проект

В этом репозитории навык лежит по пути `.agents/skills/afina-module-builder-skill/`. Чтобы избежать двойной вложенности, ставьте его в два шага:

```bash
git clone https://github.com/YourNeighborZ/afina-module-builder-skill.git ".agents/skills/afina-module-builder-skill-repo"
mkdir -p ".agents/skills/afina-module-builder-skill"
cp -R ".agents/skills/afina-module-builder-skill-repo/.agents/skills/afina-module-builder-skill/." ".agents/skills/afina-module-builder-skill/"
rm -rf ".agents/skills/afina-module-builder-skill-repo"
```

После этого навык будет в правильной папке проекта и подхватится автоматически.
