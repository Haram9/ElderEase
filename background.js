const GEMINI_MODEL = 'gemini-1.5-flash';
const KEY_NAME = 'elderEaseGeminiApiKey';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(KEY_NAME).then((data) => {
    if (!data[KEY_NAME]) {
      chrome.storage.local.set({ [KEY_NAME]: '' });
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'elderEase:askGemini') return false;

  (async () => {
    try {
      const { [KEY_NAME]: key } = await chrome.storage.local.get(KEY_NAME);
      if (!key) {
        throw new Error('Gemini API key missing in Extension Options');
      }

      const text = await askGemini(key, message.payload.prompt, message.payload.context);
      sendResponse({ ok: true, text });
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
  })();

  return true;
});

async function askGemini(apiKey, prompt, context) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const systemPrompt = [
    'You are ElderEase, an accessibility-first assistant for older adults navigating websites.',
    'Use very clear and gentle language.',
    'Use short numbered steps when giving instructions.',
    'Avoid jargon and explain terms simply.',
    'Warn users about scams, suspicious links, and sharing passwords or OTPs.',
    'If context is unclear, suggest safe next actions.'
  ].join(' ');

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${systemPrompt}\n\nUser request:\n${prompt}\n\nWebpage context JSON:\n${JSON.stringify(context).slice(0, 13000)}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 1024
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${text.slice(0, 300)}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n')?.trim();
  if (!text) throw new Error('Empty Gemini response');
  return text;
}
