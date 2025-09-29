# A2A Messenger

Мессенджер для общения с агентами через протокол Agent2Agent (A2A).

![A2A Messenger](https://img.shields.io/badge/A2A-Messenger-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6)

## 🚀 Возможности

- ✅ **Добавление агентов по URL** - подключайтесь к любым A2A-совместимым агентам
- ✅ **Чат-интерфейс** - интуитивный интерфейс в стиле Telegram
- ✅ **История сообщений** - все сообщения сохраняются локально
- ✅ **Статусы агентов** - online/offline/busy
- ✅ **Непрочитанные сообщения** - счетчики и уведомления
- ✅ **Прокси-сервер** - обход CORS-ограничений
- ✅ **Темная тема** - приятный дизайн для глаз

## 📋 Требования

- Node.js 18+
- npm или yarn

## 🛠️ Установка

```bash
# Клонируйте репозиторий
git clone <repository-url>
cd a2a-protocol-ui

# Установите зависимости
npm install
```

## 🏃 Запуск

```bash
# Запустить приложение в режиме разработки
npm run dev
```

Приложение будет доступно по адресу:
- **Frontend**: http://localhost:3000
- **Proxy Server**: http://localhost:3001

## 📦 Структура проекта

```
a2a-protocol-ui/
├── src/
│   ├── components/          # React компоненты
│   │   ├── AgentList.tsx    # Список агентов (боковая панель)
│   │   ├── ChatWindow.tsx   # Окно чата с агентом
│   │   └── AddAgentModal.tsx # Модальное окно добавления агента
│   ├── services/            # Сервисы
│   │   └── a2aClient.ts     # Клиент для работы с A2A протоколом
│   ├── store/               # Управление состоянием
│   │   └── useStore.ts      # Zustand store
│   ├── types/               # TypeScript типы
│   │   └── agent.ts         # Типы для агентов и сообщений
│   ├── App.tsx              # Главный компонент
│   ├── App.css              # Стили
│   └── main.tsx             # Точка входа
├── server.js                # Прокси-сервер для обхода CORS
├── index.html               # HTML шаблон
├── vite.config.ts           # Конфигурация Vite
├── tsconfig.json            # Конфигурация TypeScript
└── package.json             # Зависимости проекта
```

## 🔌 Использование

### 1. Добавить агента

1. Нажмите кнопку **"+"** в левом верхнем углу
2. Введите URL агента (например: `https://agent.example.com/api`)
3. Нажмите **"Add Agent"**

### 2. Начать чат

1. Выберите агента из списка слева
2. Введите сообщение в поле внизу
3. Нажмите Enter или кнопку отправки

### 3. Удалить агента

1. Наведите курсор на агента в списке
2. Нажмите кнопку удаления (🗑️)

## 🔧 A2A Протокол

Приложение использует [Agent2Agent Protocol v0.3.0](https://github.com/google/agent2agent) через JSON-RPC 2.0.

### Отправка сообщения
```json
{
  "jsonrpc": "2.0",
  "method": "message/send",
  "params": {
    "message": {
      "kind": "message",
      "messageId": "unique-message-id",
      "role": "user",
      "parts": [
        {
          "kind": "text",
          "text": "Ваше сообщение"
        }
      ]
    }
  },
  "id": "unique-request-id"
}
```

**Ответ** может быть либо `Message`, либо `Task`:
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "kind": "message",
    "messageId": "response-message-id",
    "role": "agent",
    "parts": [
      {
        "kind": "text",
        "text": "Ответ агента"
      }
    ]
  }
}
```

### Получение информации об агенте
```json
{
  "jsonrpc": "2.0",
  "method": "agent/getAuthenticatedExtendedCard",
  "id": "unique-request-id"
}
```

**Ответ** - AgentCard с метаданными агента:
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "name": "Agent Name",
    "description": "Agent description",
    "url": "https://agent.example.com",
    "capabilities": { ... },
    "skills": [ ... ]
  }
}
```

## 🐛 Отладка

Все запросы и ответы логируются в консоль браузера и консоль сервера:

- 🔵 - Исходящий запрос
- 🟢 - Успешный ответ
- ❌ - Ошибка

### Консоль браузера (F12)
```
🔵 A2A Request: { method: "message/send", ... }
🟢 A2A Response: { result: { ... } }
```

### Консоль сервера
```
🔵 Proxy Request to: https://agent.example.com
🟢 Proxy Response Status: 200
```

## 📝 Конфигурация

### Изменить порт прокси-сервера

В [server.js](server.js):
```javascript
const PORT = 3001; // Измените на нужный порт
```

В [src/services/a2aClient.ts](src/services/a2aClient.ts):
```typescript
const PROXY_URL = 'http://localhost:3001/api/proxy';
```

### Изменить порт клиента

В [vite.config.ts](vite.config.ts):
```typescript
server: {
  port: 3000, // Измените на нужный порт
}
```

## 🏗️ Сборка для продакшена

```bash
# Собрать приложение
npm run build

# Предварительный просмотр сборки
npm run preview
```

Собранные файлы будут в директории `dist/`.

## 🔐 Безопасность

- Все запросы к агентам проходят через локальный прокси-сервер
- Данные агентов и сообщения хранятся в localStorage браузера
- Не храните чувствительную информацию в сообщениях

## 📚 Технологии

- **React 18** - UI библиотека
- **TypeScript** - типизация
- **Vite** - сборщик
- **Zustand** - управление состоянием
- **Express** - прокси-сервер
- **Lucide React** - иконки

## 🤝 Вклад

Приветствуются pull requests и issues!

## 📄 Лицензия

MIT

## 💡 Примечания

- Приложение работает только в режиме разработки с включенным прокси-сервером
- Для продакшена настройте CORS на стороне агента или используйте отдельный прокси
- История сообщений хранится в localStorage и может быть ограничена размером браузера

## 🆘 Troubleshooting

### Ошибка CORS
Убедитесь, что прокси-сервер запущен (`npm run server`)

### Агент не отвечает
Проверьте логи в консоли браузера и сервера для диагностики

### Ошибка "URL is required"
Убедитесь, что URL агента начинается с `http://` или `https://`

---

Сделано с ❤️ для работы с Agent2Agent протоколом