/* ========== Twitch Random Streamer — Popup Logic ========== */

const $ = (sel) => document.querySelector(sel);

// DOM refs
const screenMain     = $('#screen-main');
const screenSettings = $('#screen-settings');
const btnSettings    = $('#btn-settings');
const btnBack        = $('#btn-back');
const btnRandom      = $('#btn-random');
const btnSave        = $('#btn-save-settings');
const statusEl       = $('#status');
const settingsStatus = $('#settings-status');
const categoryInput  = $('#category');
const suggestionsEl  = $('#category-suggestions');

// ===== Screen Navigation =====

btnSettings.addEventListener('click', () => {
  screenMain.classList.remove('active');
  screenSettings.classList.add('active');
  loadApiSettings();
});

btnBack.addEventListener('click', () => {
  screenSettings.classList.remove('active');
  screenMain.classList.add('active');
});

// ===== Load / Save Filter Settings =====

async function loadFilterSettings() {
  const data = await chrome.storage.local.get({
    language: 'ru',
    viewerMode: 'less',
    viewerCount: 10,
    category: 'Just Chatting',
  });

  $('#language').value       = data.language;
  $('#viewer-mode').value    = data.viewerMode;
  $('#viewer-count').value   = data.viewerCount;
  categoryInput.value       = data.category;
}

async function saveFilterSettings() {
  await chrome.storage.local.set({
    language:    $('#language').value,
    viewerMode:  $('#viewer-mode').value,
    viewerCount: parseInt($('#viewer-count').value, 10) || 10,
    category:    categoryInput.value.trim(),
  });
}

// ===== Load / Save API Settings =====

async function loadApiSettings() {
  const data = await chrome.storage.local.get({ clientId: '', clientSecret: '' });
  $('#client-id').value     = data.clientId;
  $('#client-secret').value = data.clientSecret;
}

btnSave.addEventListener('click', async () => {
  const clientId     = $('#client-id').value.trim();
  const clientSecret = $('#client-secret').value.trim();

  if (!clientId || !clientSecret) {
    showStatus(settingsStatus, 'Заполните оба поля', 'error');
    return;
  }

  await chrome.storage.local.set({ clientId, clientSecret, accessToken: '', tokenExpiry: 0 });
  showStatus(settingsStatus, '✓ Сохранено!', 'success');
});

// ===== Category Autocomplete =====

let searchTimeout = null;

categoryInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const query = categoryInput.value.trim();

  if (query.length < 2) {
    suggestionsEl.classList.add('hidden');
    return;
  }

  searchTimeout = setTimeout(() => {
    chrome.runtime.sendMessage({ type: 'searchCategories', query }, (response) => {
      if (!response || !response.data || response.data.length === 0) {
        suggestionsEl.classList.add('hidden');
        return;
      }
      renderSuggestions(response.data);
    });
  }, 300);
});

categoryInput.addEventListener('blur', () => {
  // Delay hide so click on suggestion registers
  setTimeout(() => suggestionsEl.classList.add('hidden'), 200);
});

function renderSuggestions(categories) {
  suggestionsEl.innerHTML = '';
  categories.forEach((cat) => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';

    const img = document.createElement('img');
    img.src = cat.box_art_url
      ? cat.box_art_url.replace('{width}', '52').replace('{height}', '72')
      : '';
    img.alt = cat.name;

    const span = document.createElement('span');
    span.textContent = cat.name;

    div.appendChild(img);
    div.appendChild(span);

    div.addEventListener('mousedown', (e) => {
      e.preventDefault(); // prevent blur
      categoryInput.value = cat.name;
      suggestionsEl.classList.add('hidden');
    });

    suggestionsEl.appendChild(div);
  });
  suggestionsEl.classList.remove('hidden');
}

// ===== Random Button =====

btnRandom.addEventListener('click', async () => {
  await saveFilterSettings();

  const language    = $('#language').value;
  const viewerMode  = $('#viewer-mode').value;
  const viewerCount = parseInt($('#viewer-count').value, 10) || 10;
  const category    = categoryInput.value.trim();

  btnRandom.classList.add('loading');
  showStatus(statusEl, '🔍 Ищем стримера...', 'info');

  chrome.runtime.sendMessage(
    {
      type: 'findRandomStream',
      filters: { language, viewerMode, viewerCount, category },
    },
    (response) => {
      btnRandom.classList.remove('loading');

      if (chrome.runtime.lastError) {
        showStatus(statusEl, '❌ Ошибка: ' + chrome.runtime.lastError.message, 'error');
        return;
      }

      if (!response) {
        showStatus(statusEl, '❌ Нет ответа от расширения. Проверьте настройки API.', 'error');
        return;
      }

      if (response.error) {
        showStatus(statusEl, '❌ ' + response.error, 'error');
        return;
      }

      if (response.url) {
        showStatus(statusEl, `✓ Открываем ${response.name}...`, 'success');
        // Navigate current tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.update(tabs[0].id, { url: response.url });
            // Close popup after short delay
            setTimeout(() => window.close(), 600);
          }
        });
      }
    }
  );
});

// ===== Helpers =====

function showStatus(el, message, type) {
  el.textContent = message;
  el.className = `status ${type}`;
  el.classList.remove('hidden');
}

// ===== Init =====
loadFilterSettings();
