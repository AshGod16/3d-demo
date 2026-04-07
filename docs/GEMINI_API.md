# Gemini API Reference (Browser / TypeScript)

## Model

Use `gemini-2.5-flash-preview-04-17` as the default model for this project.

> Note: "Gemini 3 Flash" was referred to during planning. The actual latest model ID as of April 2026
> is `gemini-3-flash-preview`. Verify at https://ai.google.dev/gemini-api/docs/models if unsure.

## Package

```bash
npm install @google/genai
```

Browser-specific import (avoids Node.js-only internals):

```typescript
import { GoogleGenAI } from '@google/genai/web';
```

## Initialization

```typescript
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
```

Add to `.env` (never commit this file):

```
VITE_GEMINI_API_KEY=your_key_here
```

## Single-turn request

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  systemInstruction: 'You are a helpful assistant.',
  contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
});
console.log(response.text);
```

## Multi-turn chat (pass full history)

```typescript
type Message = { role: 'user' | 'model'; text: string };

async function sendMessage(history: Message[], userText: string): Promise<string> {
  const contents = [...history, { role: 'user' as const, text: userText }].map(m => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    systemInstruction: '...',
    contents,
  });

  return response.text ?? '';
}
```

## Streaming

```typescript
const stream = await ai.models.generateContentStream({
  model: 'gemini-3-flash-preview',
  systemInstruction: '...',
  contents,
});

for await (const chunk of stream) {
  process(chunk.text); // partial text, append to UI
}
```

## System prompt

Passed as the top-level `systemInstruction` string — not part of `contents`.

## CORS

The Gemini API supports browser-direct calls. No proxy needed for this POC.

## API key security

- Fine for a local/internal POC using `VITE_GEMINI_API_KEY` in `.env`
- For any public deployment, route calls through a backend proxy instead
