const KEY_NAME = 'elderEaseGeminiApiKey';

const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

(async () => {
  const data = await chrome.storage.local.get(KEY_NAME);
  apiKeyInput.value = data[KEY_NAME] || '';
})();

saveBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  await chrome.storage.local.set({ [KEY_NAME]: key });
  statusEl.textContent = key ? 'Saved ✅' : 'Key cleared.';
});
