// === Sound Definitions ===
const SOUNDS = [
  { file: '/sounds/PeonYes3.ogg', label: '"Work, work."' },
  { file: '/sounds/PeonYes1.ogg', label: '"I can do that."' },
  { file: '/sounds/PeonYes2.ogg', label: '"Be happy to."' },
  { file: '/sounds/PeonYes4.ogg', label: '"Okie dokie."' },
  { file: '/sounds/PeonReady1.ogg', label: '"Ready to work!"' },
];

// === State ===
let volume = 0.8;
let lastPlayedIndex = -1;
let audioUnlocked = false;
let audioContext = null;

// === DOM Elements ===
const statusEl = document.getElementById('status');
const statusText = statusEl.querySelector('.status-text');
const unlockBanner = document.getElementById('unlockBanner');
const volumeSlider = document.getElementById('volume');
const volumeValue = document.getElementById('volumeValue');
const testBtn = document.getElementById('testSound');
const soundListEl = document.getElementById('soundList');
const historyList = document.getElementById('historyList');

// === Audio Preloading ===
const audioPool = SOUNDS.map((s) => {
  const audio = new Audio(s.file);
  audio.preload = 'auto';
  return audio;
});

// === Unlock Audio (browser autoplay policy) ===
function unlockAudio() {
  // Create and resume AudioContext to satisfy autoplay policy
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioContext.resume();

  // Play a silent buffer to fully unlock audio
  const buffer = audioContext.createBuffer(1, 1, 22050);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);

  // Also try to play each audio element briefly
  audioPool.forEach((audio) => {
    audio.volume = 0;
    audio.play().then(() => audio.pause()).catch(() => { });
    audio.volume = volume;
    audio.currentTime = 0;
  });

  audioUnlocked = true;
  unlockBanner.style.display = 'none';
}

document.getElementById('unlockSound').addEventListener('click', unlockAudio);

// === Play Sound ===
function playSound(index) {
  if (index < 0 || index >= SOUNDS.length) return;

  const audio = audioPool[index];
  audio.volume = volume;
  audio.currentTime = 0;
  audio.play()
    .then(() => {
      // 如果播放成功（例如浏览器设置中允许了该网站的自动播放），隐藏解锁提示
      if (!audioUnlocked) {
        audioUnlocked = true;
        unlockBanner.style.display = 'none';
      }
    })
    .catch((err) => {
      console.warn('Audio play failed:', err);
      // 如果播放被拦截，确保显示提示
      unlockBanner.style.display = 'block';
    });

  // Highlight the playing sound item
  document.querySelectorAll('.sound-item').forEach((el) => el.classList.remove('playing'));
  const item = document.querySelector(`.sound-item[data-index="${index}"]`);
  if (item) {
    item.classList.add('playing');
    audio.addEventListener('ended', () => item.classList.remove('playing'), { once: true });
  }
}

function playRandomSound() {
  let index;
  // Avoid repeating the last played sound
  do {
    index = Math.floor(Math.random() * SOUNDS.length);
  } while (index === lastPlayedIndex && SOUNDS.length > 1);

  lastPlayedIndex = index;
  playSound(index);
  return SOUNDS[index];
}

// === Volume Control ===
volumeSlider.addEventListener('input', (e) => {
  volume = e.target.value / 100;
  volumeValue.textContent = `${e.target.value}%`;
});

// === Test Button ===
testBtn.addEventListener('click', () => {
  if (!audioUnlocked) unlockAudio();
  playRandomSound();
});

// === Render Sound List ===
function renderSoundList() {
  soundListEl.innerHTML = SOUNDS.map(
    (s, i) => `
    <div class="sound-item" data-index="${i}" title="点击预览">
      <span class="play-icon">▶</span>
      <span class="sound-label">${s.label}</span>
    </div>
  `
  ).join('');

  // Click to preview
  soundListEl.querySelectorAll('.sound-item').forEach((el) => {
    el.addEventListener('click', () => {
      if (!audioUnlocked) unlockAudio();
      playSound(parseInt(el.dataset.index));
    });
  });
}

renderSoundList();

// === Notification History ===
function addHistoryItem(message, soundLabel) {
  // Remove empty state
  const emptyState = historyList.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const time = new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const item = document.createElement('div');
  item.className = 'history-item';
  item.innerHTML = `
    <span class="notify-icon">🔨</span>
    <div class="notify-content">
      <div class="notify-message">${escapeHtml(message)}</div>
      <div class="notify-sound">♪ ${escapeHtml(soundLabel)}</div>
    </div>
    <span class="notify-time">${time}</span>
  `;

  historyList.prepend(item);

  // Keep max 50 items
  while (historyList.children.length > 50) {
    historyList.removeChild(historyList.lastChild);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}



// === SSE Connection ===
let eventSource = null;
let reconnectTimer = null;

function connect() {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource('/events');

  eventSource.onopen = () => {
    statusEl.className = 'status connected';
    statusText.textContent = '已连接';
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'connected') {
        statusEl.className = 'status connected';
        statusText.textContent = '已连接';
        return;
      }

      if (data.type === 'notify') {
        if (navigator.locks) {
          navigator.locks.request(`notify_${data.id || data.timestamp}`, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
            if (lock) {
              handleNotification(data, true);
              // 保持锁 500ms，防止其他窗口由于微小的时间差同时获取到锁
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              handleNotification(data, false);
            }
          });
        } else {
          handleNotification(data, true);
        }
      }
    } catch (err) {
      console.error('Failed to parse SSE data:', err);
    }
  };

  eventSource.onerror = () => {
    statusEl.className = 'status disconnected';
    statusText.textContent = '已断开';
    eventSource.close();

    // Reconnect after 3 seconds
    reconnectTimer = setTimeout(connect, 3000);
  };
}

function handleNotification(data, isLeader = true) {
  if (isLeader) {
    // Play random sound
    const sound = playRandomSound();
    // Add to history
    addHistoryItem(data.message, sound.label);
  } else {
    // 不要播放声音，仅记录历史
    addHistoryItem(data.message, '🔇 (已在其他窗口播放)');
  }

  // Flash the page
  document.body.classList.add('flash');
  setTimeout(() => document.body.classList.remove('flash'), 800);

  // Update page title temporarily
  const originalTitle = document.title;
  document.title = `🔔 ${data.message}`;
  setTimeout(() => {
    document.title = originalTitle;
  }, 5000);
}

// === Auto-detect Autoplay Permission ===
async function checkAutoplayPermission() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // 尝试立刻恢复上下文，如果浏览器白名单允许，这会成功并没有报错
    await ctx.resume();
    if (ctx.state === 'running') {
      audioUnlocked = true;
      unlockBanner.style.display = 'none';
      console.log('Autoplay is enabled by browser settings.');
    }
  } catch (err) {
    console.log('Autoplay requires user gesture.');
  }
}
checkAutoplayPermission();

// === Start Connection ===
connect();
