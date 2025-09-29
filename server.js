import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/proxy', async (req, res) => {
  const { url, body } = req.body;

  console.log('🔵 Proxy Request to:', url);
  console.log('🔵 Request Body:', JSON.stringify(body, null, 2));

  if (!url) {
    console.error('❌ URL is required');
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('🟢 Proxy Response Status:', response.status);

    const data = await response.json();
    console.log('🟢 Proxy Response Data:', JSON.stringify(data, null, 2));

    res.json(data);
  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to proxy request',
      message: error.message
    });
  }
});

app.post('/api/proxy/stream', async (req, res) => {
  const { url, body } = req.body;

  console.log('🔵 Streaming Proxy Request to:', url);
  console.log('🔵 Request Body:', JSON.stringify(body, null, 2));

  if (!url) {
    console.error('❌ URL is required');
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(body),
    });

    console.log('🟢 Streaming Response Status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Check if response is streaming
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      // Stream SSE responses
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('🟢 Stream completed');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('🟢 Stream chunk received:', chunk.substring(0, 100));
          res.write(chunk);
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      // Non-streaming response, return as single SSE event
      const data = await response.json();
      console.log('🟢 Non-streaming response, sending as SSE');
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('❌ Streaming proxy error:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.write(`data: ${JSON.stringify({ error: { message: error.message } })}\n\n`);
    res.end();
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});