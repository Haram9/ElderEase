(() => {
  if (window.__elderEaseLoaded) return;
  window.__elderEaseLoaded = true;

  const STORAGE_KEYS = {
    CHAT_LOGS: 'elderEaseChatLogs',
    FONT_SCALE: 'elderEaseFontScale'
  };

  let fontScale = 1;
  const transcript = [];

  const sidebar = document.createElement('aside');
  sidebar.id = 'elderEaseSidebar';
  sidebar.innerHTML = `
    <div id="header">
      <span>ElderEase</span>
      <button id="collapseBtn" title="Hide helper"></button>
    </div>
    <div class="subtitle">Your gentle guide for this website</div>

    <div class="action-row">
      <button id="summarizeBtn" class="action-btn">Summarize</button>
      <button id="explainBtn" class="action-btn">Explain</button>
    </div>
    <div class="action-row">
      <button id="linksBtn" class="action-btn">Important Links</button>
      <button id="simplifyBtn" class="action-btn">Guide Me</button>
    </div>

    <div class="text-size-row">
      <button id="increaseTextBtn" class="text-size-btn">Bigger</button>
      <button id="decreaseTextBtn" class="text-size-btn">Smaller</button>
    </div>

    <button id="exportLogsBtn">Export chat logs</button>

    <div id="chatContainer" aria-live="polite"></div>

    <div id="inputContainer">
      <input id="userInput" type="text" placeholder="Ask me what to click or do next..." />
      <button id="voiceBtn" title="Voice input">🎤</button>
      <button id="sendBtn" title="Send message">➤</button>
    </div>
    <div id="status">Ready to help 🌼</div>
  `;

  const bubble = document.createElement('button');
  bubble.id = 'elderEaseBubble';
  bubble.title = 'Open ElderEase';

  document.body.appendChild(sidebar);
  document.body.appendChild(bubble);

  const refs = {
    sidebar,
    bubble,
    collapseBtn: document.getElementById('collapseBtn'),
    summarizeBtn: document.getElementById('summarizeBtn'),
    explainBtn: document.getElementById('explainBtn'),
    linksBtn: document.getElementById('linksBtn'),
    simplifyBtn: document.getElementById('simplifyBtn'),
    increaseTextBtn: document.getElementById('increaseTextBtn'),
    decreaseTextBtn: document.getElementById('decreaseTextBtn'),
    exportLogsBtn: document.getElementById('exportLogsBtn'),
    chatContainer: document.getElementById('chatContainer'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),
    voiceBtn: document.getElementById('voiceBtn'),
    status: document.getElementById('status')
  };

  const setStatus = (message) => {
    refs.status.textContent = message;
  };

  const addMessage = async (role, text, { save = true } = {}) => {
    const message = document.createElement('div');
    message.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    message.innerHTML = role === 'ai' ? renderText(text) : escapeHtml(text);
    refs.chatContainer.appendChild(message);
    refs.chatContainer.scrollTop = refs.chatContainer.scrollHeight;

    if (save) {
      const item = { role, text, ts: new Date().toISOString(), url: location.href };
      transcript.push(item);
      await persistLogs(item);
    }

    if (role === 'ai' && 'speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(stripHtml(message.innerHTML));
      utter.rate = 0.95;
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    }
  };

  const renderText = (text) => {
    const escaped = escapeHtml(text);
    return escaped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/g, '<br/>');
  };

  const escapeHtml = (str) => str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const stripHtml = (html) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const getPageSummaryData = () => {
    const title = document.title;
    const headings = [...document.querySelectorAll('h1, h2, h3')].slice(0, 12).map((h) => h.textContent.trim()).filter(Boolean);
    const buttons = [...document.querySelectorAll('button, input[type="submit"], [role="button"]')]
      .slice(0, 20)
      .map((b) => (b.innerText || b.value || b.getAttribute('aria-label') || '').trim())
      .filter(Boolean);
    const links = [...document.querySelectorAll('a[href]')]
      .slice(0, 25)
      .map((a) => ({ text: (a.textContent || '').trim(), href: a.href }))
      .filter((l) => l.text);
    const forms = [...document.forms].map((f) => ({
      id: f.id || 'form',
      fields: [...f.querySelectorAll('input,select,textarea')].map((el) => el.name || el.id || el.type).slice(0, 10)
    })).slice(0, 10);

    return { title, url: location.href, headings, buttons, links, forms };
  };

  const askGemini = (prompt, context) => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'elderEase:askGemini',
      payload: { prompt, context }
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || 'Gemini request failed'));
        return;
      }
      resolve(response.text);
    });
  });

  const sendChat = async (prompt, systemMode = 'chat') => {
    if (!prompt?.trim()) return;

    await addMessage('user', prompt);
    refs.userInput.value = '';
    setStatus('Thinking...');

    const context = getPageSummaryData();

    try {
      const text = await askGemini(prompt, { ...context, systemMode, recentTranscript: transcript.slice(-12) });
      await addMessage('ai', text);
      setStatus('Done ✅');
    } catch (error) {
      await addMessage('ai', `I hit a small issue: ${error.message}. Please add your Gemini key in extension options.`);
      setStatus('Need setup help ⚙️');
    }
  };

  const highlightImportant = () => {
    document.querySelectorAll('.elderEase-highlight').forEach((el) => el.classList.remove('elderEase-highlight'));
    const candidates = [...document.querySelectorAll('button, a, input, [role="button"]')]
      .filter((el) => el.offsetParent !== null)
      .slice(0, 6);
    candidates.forEach((el) => el.classList.add('elderEase-highlight'));
    setTimeout(() => {
      candidates.forEach((el) => el.classList.remove('elderEase-highlight'));
    }, 7000);
  };

  const updateFontScale = async (delta) => {
    fontScale = Math.min(1.6, Math.max(0.85, Number((fontScale + delta).toFixed(2))));
    document.documentElement.style.fontSize = `${fontScale}em`;
    setStatus(`Text size set to ${Math.round(fontScale * 100)}%`);
    await chrome.storage.local.set({ [STORAGE_KEYS.FONT_SCALE]: fontScale });
  };

  const exportLogs = async () => {
    const { [STORAGE_KEYS.CHAT_LOGS]: logs = [] } = await chrome.storage.local.get(STORAGE_KEYS.CHAT_LOGS);
    const data = {
      exportedAt: new Date().toISOString(),
      page: location.href,
      logs
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `elderease-chatlogs-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Logs exported 📥');
  };

  const persistLogs = async (newItem) => {
    const { [STORAGE_KEYS.CHAT_LOGS]: existing = [] } = await chrome.storage.local.get(STORAGE_KEYS.CHAT_LOGS);
    existing.push(newItem);
    const trimmed = existing.slice(-500);
    await chrome.storage.local.set({ [STORAGE_KEYS.CHAT_LOGS]: trimmed });
  };

  const initVoiceInput = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      refs.voiceBtn.disabled = true;
      refs.voiceBtn.title = 'Voice input not supported in this browser';
      return;
    }

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      refs.voiceBtn.classList.add('listening');
      setStatus('Listening...');
    };

    recognition.onend = () => {
      refs.voiceBtn.classList.remove('listening');
      setStatus('Voice input complete');
    };

    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      refs.userInput.value = text;
      sendChat(text);
    };

    recognition.onerror = () => {
      refs.voiceBtn.classList.remove('listening');
      setStatus('Voice input failed. Try again.');
    };

    refs.voiceBtn.addEventListener('click', () => recognition.start());
  };

  const loadSavedState = async () => {
    const saved = await chrome.storage.local.get([STORAGE_KEYS.FONT_SCALE]);
    fontScale = saved[STORAGE_KEYS.FONT_SCALE] || 1;
    document.documentElement.style.fontSize = `${fontScale}em`;
    await addMessage('ai', 'Hi! I can summarize this page, guide you step-by-step, enlarge text, and chat by voice.', { save: false });
  };

  refs.collapseBtn.addEventListener('click', () => {
    sidebar.classList.add('collapsed');
    bubble.style.display = 'flex';
  });

  bubble.addEventListener('click', () => {
    sidebar.classList.remove('collapsed');
    bubble.style.display = 'none';
  });

  refs.sendBtn.addEventListener('click', () => sendChat(refs.userInput.value));
  refs.userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') sendChat(refs.userInput.value);
  });

  refs.summarizeBtn.addEventListener('click', () => {
    sendChat('Please summarize this webpage for an elderly person in very simple, friendly language with clear bullet points.', 'summarize');
  });

  refs.explainBtn.addEventListener('click', () => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
      sendChat(`Explain this selected text simply: "${selection}"`, 'explain');
      return;
    }
    sendChat('Explain the most important section on this page in very simple language.', 'explain');
  });

  refs.linksBtn.addEventListener('click', () => {
    highlightImportant();
    sendChat('Give me the most important links and what each link is for in one line each.', 'links');
  });

  refs.simplifyBtn.addEventListener('click', () => {
    highlightImportant();
    sendChat('Act as a navigation coach. Give me a step-by-step guide for common tasks on this page (like login, checking balance, paying bill).', 'guide');
  });

  refs.increaseTextBtn.addEventListener('click', () => updateFontScale(0.08));
  refs.decreaseTextBtn.addEventListener('click', () => updateFontScale(-0.08));
  refs.exportLogsBtn.addEventListener('click', exportLogs);

  initVoiceInput();
  loadSavedState();
})();
