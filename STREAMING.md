# A2A Streaming Implementation

## Как работает стриминг

По спецификации A2A v0.3.0, стриминг реализован через:

1. **Метод**: `message/stream` (вместо `message/send`)
2. **Протокол**: Server-Sent Events (SSE) с `Content-Type: text/event-stream`
3. **Формат**: Множественные JSON-RPC 2.0 ответы для одного запроса

## Типы событий в стриме

### 1. Task (начальный ответ)
```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": {
    "kind": "task",
    "id": "task-id",
    "contextId": "context-id",
    "status": { "state": "running" }
  }
}
```

### 2. Message (промежуточные сообщения)
```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": {
    "kind": "message",
    "messageId": "msg-id",
    "role": "agent",
    "taskId": "task-id",
    "contextId": "context-id",
    "parts": [
      { "kind": "text", "text": "Ищу информацию..." }
    ]
  }
}
```

### 3. TaskStatusUpdateEvent (обновления статуса)
```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": {
    "kind": "status-update",
    "taskId": "task-id",
    "contextId": "context-id",
    "final": true,
    "status": {
      "state": "completed",
      "message": {
        "role": "agent",
        "parts": [{ "kind": "text", "text": "Финальный ответ" }]
      }
    }
  }
}
```

## Исправленная реализация

### Клиент (A2AClient)
- Использует `message/stream` метод
- Читает SSE поток через `ReadableStream`
- Парсит события по `kind`
- Вызывает `onUpdate()` колбэк для каждого промежуточного сообщения

### Прокси-сервер
- Endpoint: `POST /api/proxy/stream`
- Пробрасывает SSE от агента к браузеру
- Правильные заголовки: `Content-Type: text/event-stream`

### UI (ChatWindow)
- Добавляет новое сообщение для каждого промежуточного обновления
- Обновляет существующее сообщение если текст является продолжением
- Использует `updateMessage()` для реактивного обновления

## Запуск

```bash
# Установить зависимости
npm install

# Запустить (сервер на :3001, клиент на :3000)
npm run dev
```

## Отладка

Все стриминговые события логируются в консоль:
- 🔵 Запросы
- 💬 Промежуточные сообщения
- 📊 Обновления статуса
- 📋 Task события
- 🟢 Успешные ответы
- ❌ Ошибки