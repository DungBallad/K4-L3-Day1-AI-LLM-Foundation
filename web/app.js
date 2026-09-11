// State Management
let state = {
  sessions: [],
  currentSessionId: null,
  isGenerating: false,
  abortController: null,
};

// DOM Elements
const sessionsListEl = document.getElementById('sessions-list');
const btnNewChat = document.getElementById('btn-new-chat');
const searchSessionsInput = document.getElementById('search-sessions');
const currentSessionTitleEl = document.getElementById('current-session-title');
const modelSelectEl = document.getElementById('model-select');
const messagesContainerEl = document.getElementById('messages-container');
const chatInputEl = document.getElementById('chat-input');
const btnSend = document.getElementById('btn-send');
const btnStop = document.getElementById('btn-stop');

// Stats in Header
const statTurnsEl = document.getElementById('stat-turns');
const statTokensEl = document.getElementById('stat-tokens');
const statCostEl = document.getElementById('stat-cost');

// Active Model Display Elements
const activeModelNameEl = document.getElementById('active-model-name');
const activeModelTagEl = document.getElementById('active-model-tag');
const priceInputEl = document.getElementById('price-input');
const priceOutputEl = document.getElementById('price-output');

const MODEL_INFO = {
  'gpt-4o-mini': {
    name: 'GPT-4o Mini (gpt-4o-mini)',
    tag: '⚡ Siêu tốc & Tiết kiệm',
    inputPrice: '📥 In: $0.00015 / 1K tok',
    outputPrice: '📤 Out: $0.00060 / 1K tok',
  },
  'gpt-4o': {
    name: 'GPT-4o (gpt-4o)',
    tag: '🧠 Trí tuệ cao cấp & Lý luận sâu',
    inputPrice: '📥 In: $0.00250 / 1K tok',
    outputPrice: '📤 Out: $0.01000 / 1K tok',
  },
};

function updateActiveModelDisplay(modelId) {
  const info = MODEL_INFO[modelId] || MODEL_INFO['gpt-4o-mini'];
  if (activeModelNameEl) activeModelNameEl.textContent = info.name;
  if (activeModelTagEl) activeModelTagEl.textContent = info.tag;
  if (priceInputEl) priceInputEl.textContent = info.inputPrice;
  if (priceOutputEl) priceOutputEl.textContent = info.outputPrice;
}

// Context & Persona Elements
const personaInputEl = document.getElementById('persona-input');
const btnSavePersona = document.getElementById('btn-save-persona');
const personaSaveStatusEl = document.getElementById('persona-save-status');
const personaTokenPillEl = document.getElementById('persona-token-pill');
const contextTokenPillEl = document.getElementById('context-token-pill');
const contextTurnsListEl = document.getElementById('context-turns-list');
const droppedInfoEl = document.getElementById('dropped-info');
const droppedTextEl = document.getElementById('dropped-text');

// Parameter Elements
const paramTempEl = document.getElementById('param-temp');
const paramTopPEl = document.getElementById('param-top-p');
const paramMaxTokensEl = document.getElementById('param-max-tokens');
const valTempEl = document.getElementById('val-temp');
const valTopPEl = document.getElementById('val-top-p');
const valMaxTokensEl = document.getElementById('val-max-tokens');
const barParamSummaryEl = document.getElementById('bar-param-summary');
const btnResetParams = document.getElementById('btn-reset-params');
const chipParams = document.querySelectorAll('.chip-param');

function getActiveParams() {
  return {
    temperature: parseFloat(paramTempEl ? paramTempEl.value : 0.7) || 0.7,
    top_p: parseFloat(paramTopPEl ? paramTopPEl.value : 0.9) || 0.9,
    max_tokens: parseInt(paramMaxTokensEl ? paramMaxTokensEl.value : 512, 10) || 512,
  };
}

function updateParamDisplays() {
  if (!paramTempEl) return;
  const temp = parseFloat(paramTempEl.value).toFixed(2);
  const topP = parseFloat(paramTopPEl.value).toFixed(2);
  const maxTok = parseInt(paramMaxTokensEl.value, 10);

  if (valTempEl) valTempEl.textContent = temp;
  if (valTopPEl) valTopPEl.textContent = topP;
  if (valMaxTokensEl) valMaxTokensEl.textContent = maxTok;
  if (barParamSummaryEl) {
    barParamSummaryEl.textContent = `⚙️ T: ${temp} • P: ${topP} • Max: ${maxTok}`;
  }
}

function setParams(temp, topP, maxTok) {
  if (paramTempEl) paramTempEl.value = temp;
  if (paramTopPEl) paramTopPEl.value = topP;
  if (paramMaxTokensEl) paramMaxTokensEl.value = maxTok;
  updateParamDisplays();
}

async function saveCurrentParams() {
  const session = getCurrentSession();
  if (session) {
    const params = getActiveParams();
    session.temperature = params.temperature;
    session.top_p = params.top_p;
    session.max_tokens = params.max_tokens;
    await saveSessionToServer(session);
  }
}

// Token breakdown elements
const barPersonaTokEl = document.getElementById('bar-persona-tok');
const barHistoryTokEl = document.getElementById('bar-history-tok');
const barUserTokEl = document.getElementById('bar-user-tok');
const barTotalTokEl = document.getElementById('bar-total-tok');

// Preset Chips
const presetChips = document.querySelectorAll('.chip');

// -----------------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------------
async function init() {
  bindEvents();
  await loadSessions();
}

function bindEvents() {
  btnNewChat.addEventListener('click', createNewSession);
  btnSend.addEventListener('click', handleSendMessage);
  btnStop.addEventListener('click', handleStopGeneration);

  chatInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Auto-resize textarea
  chatInputEl.addEventListener('input', () => {
    chatInputEl.style.height = 'auto';
    chatInputEl.style.height = Math.min(chatInputEl.scrollHeight, 140) + 'px';
    updateTokenBreakdown();
  });

  searchSessionsInput.addEventListener('input', renderSessionsList);

  currentSessionTitleEl.addEventListener('blur', async () => {
    const session = getCurrentSession();
    if (session) {
      const newTitle = currentSessionTitleEl.textContent.trim() || 'Cuộc trò chuyện mới';
      session.title = newTitle;
      await saveSessionToServer(session);
      renderSessionsList();
    }
  });

  currentSessionTitleEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      currentSessionTitleEl.blur();
    }
  });

  modelSelectEl.addEventListener('change', async () => {
    const session = getCurrentSession();
    updateActiveModelDisplay(modelSelectEl.value);
    if (session) {
      session.model = modelSelectEl.value;
      await saveSessionToServer(session);
      renderSessionsList();
    }
  });

  btnSavePersona.addEventListener('click', async () => {
    const session = getCurrentSession();
    if (session) {
      session.persona = personaInputEl.value.trim();
      await saveSessionToServer(session);
      personaSaveStatusEl.textContent = '✓ Đã lưu';
      setTimeout(() => { personaSaveStatusEl.textContent = ''; }, 2000);
      updateContextInspector();
    }
  });

  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      personaInputEl.value = chip.getAttribute('data-persona');
      btnSavePersona.click();
    });
  });

  // Parameter events
  if (paramTempEl) {
    paramTempEl.addEventListener('input', () => { updateParamDisplays(); saveCurrentParams(); });
  }
  if (paramTopPEl) {
    paramTopPEl.addEventListener('input', () => { updateParamDisplays(); saveCurrentParams(); });
  }
  if (paramMaxTokensEl) {
    paramMaxTokensEl.addEventListener('input', () => { updateParamDisplays(); saveCurrentParams(); });
  }
  if (btnResetParams) {
    btnResetParams.addEventListener('click', () => {
      setParams(0.7, 0.9, 512);
      saveCurrentParams();
    });
  }
  chipParams.forEach(chip => {
    chip.addEventListener('click', () => {
      setParams(chip.dataset.temp, chip.dataset.topp, chip.dataset.max);
      saveCurrentParams();
    });
  });
}

// -----------------------------------------------------------------------------
// SESSIONS API & STORAGE
// -----------------------------------------------------------------------------
async function loadSessions() {
  try {
    const res = await fetch('/api/sessions');
    state.sessions = await res.json();
    if (!state.sessions || state.sessions.length === 0) {
      await createNewSession();
    } else {
      selectSession(state.sessions[0].id);
    }
  } catch (err) {
    console.error('Error loading sessions:', err);
  }
}

async function createNewSession() {
  const params = getActiveParams();
  const newSession = {
    id: 'session_' + Date.now(),
    title: 'Cuộc trò chuyện mới',
    persona: personaInputEl.value.trim() || 'Bạn là trợ lý AI thông minh, hỗ trợ giải đáp thắc mắc ngắn gọn, súc tích và chính xác.',
    model: modelSelectEl.value || 'gpt-4o-mini',
    temperature: params.temperature,
    top_p: params.top_p,
    max_tokens: params.max_tokens,
    messages: [],
  };

  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSession),
    });
    const saved = await res.json();
    state.sessions.unshift(saved);
    selectSession(saved.id);
  } catch (err) {
    console.error('Error creating new session:', err);
  }
}

async function saveSessionToServer(session) {
  try {
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
  } catch (err) {
    console.error('Error saving session:', err);
  }
}

async function deleteSession(id, e) {
  e.stopPropagation();
  if (!confirm('Bạn có chắc muốn xóa phiên hội thoại này?')) return;

  try {
    await fetch(`/api/sessions?id=${id}`, { method: 'DELETE' });
    state.sessions = state.sessions.filter(s => s.id !== id);
    if (state.currentSessionId === id) {
      if (state.sessions.length > 0) {
        selectSession(state.sessions[0].id);
      } else {
        await createNewSession();
      }
    } else {
      renderSessionsList();
    }
  } catch (err) {
    console.error('Error deleting session:', err);
  }
}

function getCurrentSession() {
  return state.sessions.find(s => s.id === state.currentSessionId);
}

function selectSession(sessionId) {
  state.currentSessionId = sessionId;
  const session = getCurrentSession();
  if (!session) return;

  currentSessionTitleEl.textContent = session.title || 'Cuộc trò chuyện mới';
  modelSelectEl.value = session.model || 'gpt-4o-mini';
  updateActiveModelDisplay(session.model || 'gpt-4o-mini');
  personaInputEl.value = session.persona || 'Bạn là một trợ lý AI thông minh.';

  const temp = session.temperature !== undefined ? session.temperature : 0.7;
  const topP = session.top_p !== undefined ? session.top_p : 0.9;
  const maxTok = session.max_tokens !== undefined ? session.max_tokens : 512;
  setParams(temp, topP, maxTok);

  renderSessionsList();
  renderMessages();
  updateHeaderStats();
  updateContextInspector();
}

// -----------------------------------------------------------------------------
// RENDER SESSIONS LIST (LAYOUT 1)
// -----------------------------------------------------------------------------
function renderSessionsList() {
  const query = searchSessionsInput.value.toLowerCase().trim();
  sessionsListEl.innerHTML = '';

  const filtered = state.sessions.filter(s => 
    (s.title || '').toLowerCase().includes(query) ||
    (s.messages || []).some(m => m.content.toLowerCase().includes(query))
  );

  if (filtered.length === 0) {
    sessionsListEl.innerHTML = '<div style="padding:16px; color:var(--text-muted); font-size:12px; text-align:center;">Không tìm thấy phiên chat nào</div>';
    return;
  }

  filtered.forEach(session => {
    const isActive = session.id === state.currentSessionId;
    const item = document.createElement('div');
    item.className = `session-item ${isActive ? 'active' : ''}`;
    item.onclick = () => selectSession(session.id);

    const msgCount = (session.messages || []).length;
    const turnCount = Math.floor(msgCount / 2);

    item.innerHTML = `
      <div class="session-info">
        <span class="session-title">${escapeHtml(session.title || 'Cuộc trò chuyện mới')}</span>
        <div class="session-meta">
          <span>${turnCount} lượt</span>
          <span>•</span>
          <span>${session.model || 'gpt-4o-mini'}</span>
        </div>
      </div>
      <button class="btn-del-session" title="Xóa phiên chat" onclick="deleteSession('${session.id}', event)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    `;
    sessionsListEl.appendChild(item);
  });
}

// -----------------------------------------------------------------------------
// RENDER MESSAGES & STATS (LAYOUT 2)
// -----------------------------------------------------------------------------
function renderMessages() {
  const session = getCurrentSession();
  messagesContainerEl.innerHTML = '';

  if (!session || !session.messages || session.messages.length === 0) {
    messagesContainerEl.innerHTML = `
      <div style="margin: auto; text-align: center; color: var(--text-muted); max-width: 360px;">
        <div style="font-size: 40px; margin-bottom: 12px;">💬</div>
        <h3 style="font-size: 15px; color: var(--text-primary); margin-bottom: 6px;">Bắt đầu phiên trò chuyện mới</h3>
        <p style="font-size: 13px; line-height: 1.5;">Gõ tin nhắn để trò chuyện với LLM. Cột bên phải sẽ tự động hiển thị Persona và 3 lượt lịch sử được nạp vào context.</p>
      </div>
    `;
    return;
  }

  session.messages.forEach(msg => {
    appendMessageElement(msg.role, msg.content, msg.meta);
  });

  scrollToBottom();
}

function appendMessageElement(role, content, meta = null) {
  const isUser = role === 'user';
  const msgEl = document.createElement('div');
  msgEl.className = `message ${isUser ? 'user' : 'assistant'}`;

  let metaHtml = '';
  if (!isUser && meta) {
    const modelName = meta.model || 'gpt-4o-mini';
    const tempText = meta.temperature !== undefined ? `<span>🌡️ T: ${meta.temperature}</span>` : '';
    metaHtml = `
      <div class="msg-meta-badge">
        <span class="model-badge-msg">🤖 ${escapeHtml(modelName)}</span>
        ${tempText}
        <span>⏱️ ${meta.latency || 0}s</span>
        <span>🔤 ${meta.input_tokens || 0} in / ${meta.output_tokens || 0} out</span>
        <span>💰 $${(meta.total_cost || 0).toFixed(5)}</span>
      </div>
    `;
  }

  msgEl.innerHTML = `
    <div class="msg-avatar">${isUser ? '👤' : '🤖'}</div>
    <div class="msg-bubble">
      <div class="msg-content">${formatMessageContent(content)}</div>
      ${metaHtml}
    </div>
  `;

  messagesContainerEl.appendChild(msgEl);
  return msgEl;
}

function formatMessageContent(text) {
  if (!text) return '';
  // Simple markdown-like formatter for code blocks
  let formatted = escapeHtml(text);
  
  // Format code blocks ```lang ... ```
  formatted = formatted.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Format inline code `code`
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  return formatted;
}

function updateHeaderStats() {
  const session = getCurrentSession();
  if (!session || !session.messages) {
    statTurnsEl.textContent = '0';
    statTokensEl.textContent = '0';
    statCostEl.textContent = '$0.0000';
    return;
  }

  let totalTokens = 0;
  let totalCost = 0.0;
  let turns = 0;

  session.messages.forEach(msg => {
    if (msg.role === 'assistant' && msg.meta) {
      turns += 1;
      totalTokens += (msg.meta.total_tokens || 0);
      totalCost += (msg.meta.total_cost || 0);
    }
  });

  statTurnsEl.textContent = turns;
  statTokensEl.textContent = totalTokens;
  statCostEl.textContent = `$${totalCost.toFixed(4)}`;
}

function scrollToBottom() {
  messagesContainerEl.scrollTop = messagesContainerEl.scrollHeight;
}

// -----------------------------------------------------------------------------
// CHAT STREAMING HANDLER
// -----------------------------------------------------------------------------
async function handleSendMessage() {
  const text = chatInputEl.value.trim();
  if (!text || state.isGenerating) return;

  const session = getCurrentSession();
  if (!session) return;

  // Clear input
  chatInputEl.value = '';
  chatInputEl.style.height = 'auto';

  // Add User Message to UI
  appendMessageElement('user', text);
  scrollToBottom();

  // Prepare Assistant Placeholder Bubble
  const assistantMsgEl = document.createElement('div');
  assistantMsgEl.className = 'message assistant';
  assistantMsgEl.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble">
      <div class="msg-content"><span class="streaming-text"></span><span class="streaming-cursor"></span></div>
    </div>
  `;
  messagesContainerEl.appendChild(assistantMsgEl);
  scrollToBottom();

  const streamingTextEl = assistantMsgEl.querySelector('.streaming-text');
  const cursorEl = assistantMsgEl.querySelector('.streaming-cursor');

  // Toggle buttons
  setGenerating(true);

  state.abortController = new AbortController();

  try {
    const params = getActiveParams();
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        message: text,
        model: modelSelectEl.value,
        persona: personaInputEl.value.trim(),
        temperature: params.temperature,
        top_p: params.top_p,
        max_tokens: params.max_tokens,
      }),
      signal: state.abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop(); // Keep last partial line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.replace(/^data: /, '').trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);

          if (event.type === 'init') {
            // Update Context Inspector immediately with server's 3-turn payload
            renderContextTurns(event.context_messages, event.dropped_count);
          } else if (event.type === 'chunk') {
            accumulatedText += event.text;
            streamingTextEl.innerHTML = formatMessageContent(accumulatedText);
            scrollToBottom();
          } else if (event.type === 'done') {
            cursorEl.remove();
            // Update session locally
            if (event.session) {
              const idx = state.sessions.findIndex(s => s.id === event.session.id);
              if (idx !== -1) {
                state.sessions[idx] = event.session;
              }
            }

            // Append metadata badge
            const meta = event.meta;
            const modelName = meta.model || modelSelectEl.value || 'gpt-4o-mini';
            const tempText = meta.temperature !== undefined ? `<span>🌡️ T: ${meta.temperature}</span>` : '';
            const metaDiv = document.createElement('div');
            metaDiv.className = 'msg-meta-badge';
            metaDiv.innerHTML = `
              <span class="model-badge-msg">🤖 ${escapeHtml(modelName)}</span>
              ${tempText}
              <span>⏱️ ${meta.latency || 0}s</span>
              <span>🔤 ${meta.input_tokens || 0} in / ${meta.output_tokens || 0} out</span>
              <span>💰 $${(meta.total_cost || 0).toFixed(5)}</span>
            `;
            assistantMsgEl.querySelector('.msg-bubble').appendChild(metaDiv);

            updateHeaderStats();
            renderSessionsList();
            updateContextInspector();

            // Kết thúc streaming ngay lập tức và khôi phục nút gửi
            setGenerating(false);
            try { await reader.cancel(); } catch (cancelErr) {}
            return;
          } else if (event.type === 'error') {
            cursorEl.remove();
            streamingTextEl.innerHTML = `<span style="color:var(--danger)">⚠️ Lỗi: ${escapeHtml(event.error)}</span>`;
            setGenerating(false);
            try { await reader.cancel(); } catch (cancelErr) {}
            return;
          }
        } catch (parseErr) {
          console.error('Error parsing SSE event:', parseErr);
        }
      }
    }

  } catch (err) {
    if (err.name === 'AbortError') {
      streamingTextEl.innerHTML += '<br><i style="color:var(--text-muted);font-size:11px;">(Đã dừng tạo phản hồi)</i>';
    } else {
      streamingTextEl.innerHTML = `<span style="color:var(--danger)">⚠️ Không thể kết nối đến máy chủ: ${escapeHtml(err.message)}</span>`;
    }
    if (cursorEl) cursorEl.remove();
  } finally {
    setGenerating(false);
  }
}

function handleStopGeneration() {
  if (state.abortController) {
    state.abortController.abort();
    state.abortController = null;
  }
  setGenerating(false);
}

function setGenerating(isGen) {
  state.isGenerating = isGen;
  if (isGen) {
    btnSend.classList.add('hidden');
    btnStop.classList.remove('hidden');
  } else {
    btnSend.classList.remove('hidden');
    btnStop.classList.add('hidden');
  }
}

// -----------------------------------------------------------------------------
// CONTEXT INSPECTOR (LAYOUT 3): 3 TURNS & PERSONA
// -----------------------------------------------------------------------------
async function updateContextInspector() {
  const session = getCurrentSession();
  if (!session) return;

  const personaText = session.persona || '';
  personaInputEl.value = personaText;

  // 1. Calculate Persona tokens
  const personaTok = estimateTokens(personaText);
  personaTokenPillEl.textContent = `${personaTok} tokens`;
  barPersonaTokEl.textContent = `${personaTok} tok`;

  // 2. Extract messages and prepare 3-turn window
  const messages = (session.messages || []).filter(m => m.role === 'user' || m.role === 'assistant');
  const contextWindow = messages.slice(-6); // 3 turns = 6 messages
  const droppedCount = Math.max(0, messages.length - 6);

  renderContextTurns(contextWindow, droppedCount);

  // 3. Update Token Breakdown
  updateTokenBreakdown();
}

function renderContextTurns(contextMessages, droppedCount) {
  contextTurnsListEl.innerHTML = '';

  if (!contextMessages || contextMessages.length === 0) {
    contextTurnsListEl.innerHTML = `
      <div style="color:var(--text-muted); font-size:12px; text-align:center; padding: 12px 0;">
        Chưa có lịch sử hội thoại nào
      </div>
    `;
    contextTokenPillEl.textContent = '0 tokens';
    droppedInfoEl.classList.remove('hidden');
    droppedTextEl.textContent = 'Không có tin nhắn nào bị cắt.';
    return;
  }

  // Pair messages into turns
  const turns = [];
  for (let i = 0; i < contextMessages.length; i += 2) {
    const userMsg = contextMessages[i];
    const botMsg = contextMessages[i + 1];
    turns.push({ userMsg, botMsg });
  }

  let totalHistoryTokens = 0;

  turns.forEach((turn, idx) => {
    const turnCard = document.createElement('div');
    turnCard.className = 'turn-card active-turn';

    const turnNum = idx + 1;
    const turnLabel = idx === turns.length - 1 ? `Lượt ${turnNum} (Gần nhất)` : `Lượt ${turnNum}`;

    const userText = turn.userMsg ? turn.userMsg.content : '';
    const botText = turn.botMsg ? turn.botMsg.content : '(Đang chờ...)';

    const userTok = estimateTokens(userText);
    const botTok = estimateTokens(botText);
    totalHistoryTokens += (userTok + botTok);

    turnCard.innerHTML = `
      <div class="turn-header">
        <span>${turnLabel}</span>
        <span style="color:var(--text-muted); font-weight:normal;">~${userTok + botTok} toks</span>
      </div>
      <div class="turn-message user-msg"><b>User:</b> ${escapeHtml(truncate(userText, 90))}</div>
      ${turn.botMsg ? `<div class="turn-message bot-msg"><b>Bot:</b> ${escapeHtml(truncate(botText, 110))}</div>` : ''}
    `;

    contextTurnsListEl.appendChild(turnCard);
  });

  contextTokenPillEl.textContent = `~${totalHistoryTokens} tokens`;
  barHistoryTokEl.textContent = `~${totalHistoryTokens} tok`;

  // Dropped count
  if (droppedCount > 0) {
    const droppedTurns = Math.ceil(droppedCount / 2);
    droppedInfoEl.classList.remove('hidden');
    droppedTextEl.innerHTML = `<b>${droppedCount} tin nhắn cũ</b> (${droppedTurns} lượt trước) đã tự động trượt ra ngoài Context Window!`;
  } else {
    droppedInfoEl.classList.remove('hidden');
    droppedTextEl.textContent = 'Chưa có tin nhắn nào bị cắt (đang trong phạm vi 3 lượt).';
  }
}

function updateTokenBreakdown() {
  const personaTok = estimateTokens(personaInputEl.value || '');
  const userPromptTok = estimateTokens(chatInputEl.value || '');

  // Parse history tokens from context label
  const session = getCurrentSession();
  const messages = (session && session.messages) ? session.messages.filter(m => m.role === 'user' || m.role === 'assistant') : [];
  const contextWindow = messages.slice(-6);
  let historyTok = 0;
  contextWindow.forEach(m => {
    historyTok += estimateTokens(m.content || '');
  });

  barPersonaTokEl.textContent = `${personaTok} tok`;
  barHistoryTokEl.textContent = `${historyTok} tok`;
  barUserTokEl.textContent = `${userPromptTok} tok`;

  const totalTok = personaTok + historyTok + userPromptTok;
  barTotalTokEl.textContent = `~${totalTok} tokens`;
}

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------
function estimateTokens(text) {
  if (!text) return 0;
  // Approximation for Vietnamese/English tokens: ~1 token per 3.5 characters
  return Math.max(1, Math.round(text.length / 3.5));
}

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Start the app
window.addEventListener('DOMContentLoaded', init);
