# ElderEase Chrome Extension

ElderEase is an accessibility-focused Chrome extension that helps older adults navigate complex websites (banking, utility portals, government forms) using a friendly AI assistant powered by Gemini.

## Features

- Floating sidebar helper on every page.
- Gemini-powered chat for step-by-step guidance.
- Quick actions:
  - **Summarize** page in simple language.
  - **Explain** selected text.
  - **Important Links** with purpose.
  - **Guide Me** for common tasks.
- Text size controls (**Bigger / Smaller**) for readability.
- Voice input (speech-to-text) and spoken AI responses.
- Chat logs persisted in extension storage for research, with JSON export.
- Safety-focused prompts (warns against scams, sharing OTP/passwords).

## Setup in VS Code

1. Open this folder in VS Code.
2. In Chrome, open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this folder.
5. Open extension details and click **Extension options**.
6. Paste your Gemini API key and save.
7. Open any website to use ElderEase.

## Files

- `manifest.json` — extension configuration (MV3).
- `content.js` — sidebar UI + user interactions.
- `styles.css` — ElderEase visual design.
- `background.js` — Gemini API calls and safety prompting.
- `options.html`, `options.css`, `options.js` — API key settings page.
- `preview.html` — static local preview of UI styling.

## Notes

- Your API key is stored locally in `chrome.storage.local` under `elderEaseGeminiApiKey`.
- For production/research deployments, consider adding consent text and data governance policy for log collection.
