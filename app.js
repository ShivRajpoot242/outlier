/**
 * ═══════════════════════════════════════════════════════
 * DIGITAL EXORCIST — App Controller
 * Manages screens, HUD, chore feed, and game lifecycle
 * ═══════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ── DOM References ────────────────────────────────
  const screens = {
    title: document.getElementById('title-screen'),
    howto: document.getElementById('howto-screen'),
    config: document.getElementById('config-screen'),
    game: document.getElementById('game-screen')
  };

  const hud = {
    score: document.getElementById('hud-score'),
    combo: document.getElementById('hud-combo'),
    wave: document.getElementById('hud-wave'),
    lives: document.getElementById('hud-lives'),
    shield: document.getElementById('hud-shield')
  };

  const gameOver = {
    overlay: document.getElementById('gameover-overlay'),
    score: document.getElementById('go-score'),
    kills: document.getElementById('go-kills'),
    combo: document.getElementById('go-combo'),
    chores: document.getElementById('go-chores'),
    spam: document.getElementById('go-spam'),
    emails: document.getElementById('go-emails'),
    files: document.getElementById('go-files'),
    lints: document.getElementById('go-lints'),
    waves: document.getElementById('go-waves')
  };

  const feedEntries = document.getElementById('feed-entries');
  const pauseOverlay = document.getElementById('pause-overlay');
  const configEmailAction = document.getElementById('config-email-action');
  const configEmail = document.getElementById('config-email');

  let game = null;
  let currentScreen = 'title';

  // Load saved config values into UI
  if (configEmailAction && window.choreOrchestrator?.config?.emailAction) {
    configEmailAction.value = window.choreOrchestrator.config.emailAction;
  }
  if (configEmail && window.choreOrchestrator?.config?.email) {
    configEmail.value = window.choreOrchestrator.config.email;
  }

  // ── Screen Navigation ─────────────────────────────
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    currentScreen = name;
  }

  // ── Button Handlers ───────────────────────────────
  document.getElementById('btn-start-game').addEventListener('click', () => {
    window.audioEngine.init();
    window.audioEngine.menuSelect();
    startGame();
  });

  document.getElementById('btn-how-to-play').addEventListener('click', () => {
    window.audioEngine.init();
    window.audioEngine.menuSelect();
    showScreen('howto');
  });

  document.getElementById('btn-config').addEventListener('click', () => {
    window.audioEngine.init();
    window.audioEngine.menuSelect();
    showScreen('config');
  });

  document.getElementById('btn-back-howto').addEventListener('click', () => {
    window.audioEngine.menuSelect();
    showScreen('title');
  });

  document.getElementById('btn-back-config').addEventListener('click', () => {
    window.audioEngine.menuSelect();
    showScreen('title');
  });

  document.getElementById('btn-save-config').addEventListener('click', () => {
    window.audioEngine.powerUp();

    if (window.choreOrchestrator) {
      window.choreOrchestrator.saveConfig({
        emailAction: configEmailAction ? configEmailAction.value : 'trash',
        email: configEmail ? configEmail.value.trim() : ''
      });
    }

    // Flash the button
    const btn = document.getElementById('btn-save-config');
    btn.textContent = '✓ SAVED!';
    btn.style.borderColor = '#39ff14';
    btn.style.color = '#39ff14';
    setTimeout(() => {
      btn.textContent = '💾 SAVE CONFIG';
      btn.style.borderColor = '';
      btn.style.color = '';
    }, 1500);
  });

  document.getElementById('btn-resume').addEventListener('click', () => {
    window.audioEngine.menuSelect();
    togglePause();
  });

  document.getElementById('btn-quit').addEventListener('click', () => {
    window.audioEngine.menuSelect();
    if (game) game.stop();
    gameOver.overlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    showScreen('title');
  });

  document.getElementById('btn-retry').addEventListener('click', () => {
    window.audioEngine.menuSelect();
    startGame();
  });

  document.getElementById('btn-menu').addEventListener('click', () => {
    window.audioEngine.menuSelect();
    showScreen('title');
  });

  // Config tag toggles
  document.querySelectorAll('.config-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('active');
      window.audioEngine.menuSelect();
    });
  });

  // ── Keyboard Shortcuts ────────────────────────────
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' && currentScreen === 'game') {
      togglePause();
    }
    if (e.code === 'Escape' && currentScreen === 'game') {
      togglePause();
    }
    // Start game from title with Enter
    if (e.code === 'Enter' && currentScreen === 'title') {
      window.audioEngine.init();
      window.audioEngine.menuSelect();
      startGame();
    }
  });

  function togglePause() {
    if (!game || game.gameOver) return;
    if (game.paused) {
      game.resume();
      pauseOverlay.classList.add('hidden');
    } else {
      game.pause();
      pauseOverlay.classList.remove('hidden');
    }
  }

  // ── Chore Feed ────────────────────────────────────
  function addFeedEntry(type, title, detail) {
    const entry = document.createElement('div');
    entry.className = `feed-entry type-${type}`;

    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    entry.innerHTML = `
      <span class="feed-time">${time}</span>
      <span class="feed-action">${title}</span>
      <div style="font-size: 0.6rem; color: rgba(255,255,255,0.35); margin-top: 2px; padding-left: 52px;">${detail}</div>
    `;

    feedEntries.insertBefore(entry, feedEntries.firstChild);

    // Limit feed entries
    while (feedEntries.children.length > 50) {
      feedEntries.removeChild(feedEntries.lastChild);
    }
  }

  // ── Score Formatting ──────────────────────────────
  function formatScore(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // ── Start Game ────────────────────────────────────
  function startGame() {
    showScreen('game');
    gameOver.overlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    feedEntries.innerHTML = '';

    // Reset orchestrator
    window.choreOrchestrator.reset();

    // Setup chore feed callback
    window.choreOrchestrator.onChoreExecuted = addFeedEntry;

    // Create game
    const canvas = document.getElementById('game-canvas');
    game = new window.DigitalExorcistGame(canvas);

    // Wire up HUD
    game.onScoreChange = (score) => {
      hud.score.textContent = formatScore(score);
      hud.score.style.transform = 'scale(1.2)';
      setTimeout(() => { hud.score.style.transform = 'scale(1)'; }, 100);
    };

    game.onComboChange = (combo) => {
      hud.combo.textContent = combo > 0 ? `x${combo}` : 'x1';
      if (combo >= 10) {
        hud.combo.className = 'hud-value hot';
      } else {
        hud.combo.className = 'hud-value';
      }
    };

    game.onLivesChange = (lives) => {
      hud.lives.textContent = '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(Math.max(0, 3 - lives));
    };

    game.onWaveChange = (wave) => {
      hud.wave.textContent = wave;
      addFeedEntry('combo', `🌊 WAVE ${wave} INCOMING`, `Enemy speed: +${((wave - 1) * 12)}%`);
    };

    game.onShieldChange = (shield) => {
      hud.shield.style.width = `${shield}%`;
      if (shield < 30) {
        hud.shield.style.background = 'linear-gradient(90deg, #ff2244, #ff6600)';
      } else {
        hud.shield.style.background = 'linear-gradient(90deg, #00f0ff, #39ff14)';
      }
    };

    game.onEnemyKill = (type, targetData, combo) => {
      window.choreOrchestrator.queueChore(type, targetData, combo);
    };

    game.onBossKill = (bossData) => {
      window.choreOrchestrator.executeBossKill(bossData);
    };

    game.onGameOver = (stats) => {
      const choreStats = window.choreOrchestrator.getStats();

      gameOver.score.textContent = formatScore(stats.score);
      gameOver.kills.textContent = stats.kills;
      gameOver.combo.textContent = `x${stats.maxCombo}`;
      gameOver.chores.textContent = choreStats.totalChores;
      if (gameOver.spam) gameOver.spam.textContent = choreStats.emailsDeleted || 0;
      gameOver.emails.textContent = choreStats.emailsArchived || 0;
      gameOver.files.textContent = choreStats.filesCleaned || 0;
      gameOver.lints.textContent = choreStats.lintFixes || 0;
      gameOver.waves.textContent = stats.wave;

      setTimeout(() => {
        gameOver.overlay.classList.remove('hidden');
      }, 1000);
    };

    // Handle resize
    const resizeHandler = () => {
      if (game && currentScreen === 'game') {
        game.resize();
      }
    };
    window.addEventListener('resize', resizeHandler);

    // Add initial feed entry
    const actionDesc = window.choreOrchestrator?.config?.emailAction === 'permanent'
      ? 'PERMANENT PURGE'
      : window.choreOrchestrator?.config?.emailAction === 'archive'
      ? 'SAFE ARCHIVE'
      : 'DELETE SPAM TO TRASH';

    addFeedEntry('combo', '🚀 MISSION STARTED', `Email Action: ${actionDesc}`);

    // Start the game
    game.start();

    // Reset HUD
    hud.score.textContent = '0';
    hud.combo.textContent = 'x1';
    hud.wave.textContent = '1';
    hud.lives.textContent = '♥♥♥';
    hud.shield.style.width = '100%';
  }

  // ── Ambient title screen animation ────────────────
  // Make ghosts react to mouse on title screen
  const titleScreen = document.getElementById('title-screen');
  if (titleScreen) {
    titleScreen.addEventListener('mousemove', (e) => {
      const ghosts = document.querySelectorAll('.ghost-float');
      const cx = e.clientX / window.innerWidth;
      const cy = e.clientY / window.innerHeight;
      ghosts.forEach((ghost, i) => {
        const offsetX = (cx - 0.5) * 20 * (i % 2 === 0 ? 1 : -1);
        const offsetY = (cy - 0.5) * 20 * (i % 2 === 0 ? -1 : 1);
        ghost.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      });
    });
  }

})();
