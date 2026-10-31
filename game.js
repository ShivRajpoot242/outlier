/**
 * ═══════════════════════════════════════════════════════
 * DIGITAL EXORCIST — Game Engine
 * Canvas-based Space Invaders / Galaga arcade shooter
 * 60 FPS with particle effects, combo system, boss fights
 * ═══════════════════════════════════════════════════════
 */

class DigitalExorcistGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.paused = false;
    this.gameOver = false;

    // Game state
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.comboDecay = 120; // frames until combo resets
    this.kills = 0;
    this.shield = 100;
    this.shieldRegenRate = 0.05;
    this.invulnFrames = 0;

    // Boss state
    this.bossThreshold = 1000;
    this.nextBossScore = this.bossThreshold;
    this.boss = null;

    // Entities
    this.player = null;
    this.bullets = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.particles = [];
    this.powerUps = [];
    this.stars = [];
    this.floatingTexts = [];

    // Input
    this.keys = {};
    this.lastShot = 0;
    this.fireRate = 10; // frames between shots

    // Wave management
    this.waveEnemies = 0;
    this.waveCleared = false;
    this.waveCooldown = 0;
    this.enemySpeed = 0.5;
    this.enemyShootChance = 0.003;

    // Display
    this.frameCount = 0;
    this.screenShake = 0;

    // Callbacks
    this.onScoreChange = null;
    this.onComboChange = null;
    this.onLivesChange = null;
    this.onWaveChange = null;
    this.onShieldChange = null;
    this.onGameOver = null;
    this.onEnemyKill = null;
    this.onBossKill = null;

    this._setupInput();
    this._initStars();
  }

  _setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  _initStars() {
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        speed: Math.random() * 1.5 + 0.3,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.6 + 0.2
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const hud = document.getElementById('game-hud');
    const hudH = hud ? hud.offsetHeight : 50;
    this.canvas.width = rect.width;
    this.canvas.height = rect.height - hudH;
    this.W = this.canvas.width;
    this.H = this.canvas.height;
  }

  start() {
    this.resize();
    this._reset();
    this.running = true;
    this.paused = false;
    this.gameOver = false;
    this._spawnWave();
    this._loop();
  }

  _reset() {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.shield = 100;
    this.invulnFrames = 0;
    this.nextBossScore = this.bossThreshold;
    this.boss = null;
    this.bullets = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.particles = [];
    this.powerUps = [];
    this.floatingTexts = [];
    this.frameCount = 0;
    this.enemySpeed = 0.5;
    this.enemyShootChance = 0.003;

    this.player = {
      x: this.W / 2,
      y: this.H - 60,
      width: 40,
      height: 30,
      speed: 5,
      color: '#00f0ff',
      thrusterPhase: 0
    };
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }

  _loop() {
    if (!this.running) return;
    if (!this.paused && !this.gameOver) {
      this._update();
    }
    this._render();
    requestAnimationFrame(() => this._loop());
  }

  // ═══════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════

  _update() {
    this.frameCount++;

    // Player movement
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
      this.player.x = Math.max(this.player.width / 2, this.player.x - this.player.speed);
    }
    if (this.keys['ArrowRight'] || this.keys['KeyD']) {
      this.player.x = Math.min(this.W - this.player.width / 2, this.player.x + this.player.speed);
    }

    // Shooting
    if (this.keys['Space'] && this.frameCount - this.lastShot >= this.fireRate) {
      this._playerShoot();
      this.lastShot = this.frameCount;
    }

    // Combo decay
    if (this.combo > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        if (this.onComboChange) this.onComboChange(this.combo);
      }
    }

    // Shield regen
    if (this.shield < 100) {
      this.shield = Math.min(100, this.shield + this.shieldRegenRate);
      if (this.onShieldChange) this.onShieldChange(this.shield);
    }

    // Invulnerability
    if (this.invulnFrames > 0) this.invulnFrames--;

    // Screen shake decay
    if (this.screenShake > 0) this.screenShake *= 0.9;
    if (this.screenShake < 0.5) this.screenShake = 0;

    // Update bullets
    this._updateBullets();

    // Update enemies
    this._updateEnemies();

    // Update boss
    if (this.boss) this._updateBoss();

    // Update enemy bullets
    this._updateEnemyBullets();

    // Update particles
    this._updateParticles();

    // Update floating texts
    this._updateFloatingTexts();

    // Update stars
    this._updateStars();

    // Update power-ups
    this._updatePowerUps();

    // Player thruster animation
    this.player.thrusterPhase += 0.2;

    // Check wave clear
    if (this.enemies.length === 0 && !this.boss && !this.waveCleared) {
      this.waveCleared = true;
      this.waveCooldown = 90; // 1.5 second cooldown
    }

    if (this.waveCleared) {
      this.waveCooldown--;
      if (this.waveCooldown <= 0) {
        this.wave++;
        this.enemySpeed = Math.min(2.5, 0.5 + this.wave * 0.12);
        this.enemyShootChance = Math.min(0.015, 0.003 + this.wave * 0.001);
        if (this.onWaveChange) this.onWaveChange(this.wave);
        window.audioEngine.waveStart();
        this._spawnWave();
        this.waveCleared = false;
      }
    }

    // Check boss spawn
    if (this.score >= this.nextBossScore && !this.boss) {
      this._spawnBoss();
      this.nextBossScore += this.bossThreshold;
    }
  }

  _playerShoot() {
    window.audioEngine.shoot();
    const spread = this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1;
    for (let i = 0; i < spread; i++) {
      const angle = spread === 1 ? 0 : (i - (spread - 1) / 2) * 0.12;
      this.bullets.push({
        x: this.player.x,
        y: this.player.y - this.player.height / 2,
        vx: Math.sin(angle) * 8,
        vy: -8,
        width: 4,
        height: 12,
        color: this.combo >= 10 ? '#ff2244' : this.combo >= 5 ? '#ffe600' : '#00f0ff'
      });
    }

    // Muzzle flash particles
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: this.player.x,
        y: this.player.y - this.player.height / 2,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 4 - 2,
        life: 10,
        maxLife: 10,
        size: Math.random() * 3 + 1,
        color: '#00f0ff'
      });
    }
  }

  _updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y < -20 || b.x < -20 || b.x > this.W + 20) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Check collision with enemies
      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this._collides(b, e)) {
          e.hp--;
          if (e.hp <= 0) {
            this._killEnemy(e, j);
          } else {
            this._spawnHitParticles(b.x, b.y, e.color, 4);
            window.audioEngine.hit();
          }
          this.bullets.splice(i, 1);
          hit = true;
          break;
        }
      }

      // Check collision with boss
      if (!hit && this.boss && this._collides(b, this.boss)) {
        this.boss.hp--;
        this._spawnHitParticles(b.x, b.y, '#ff00aa', 6);
        this.bullets.splice(i, 1);

        if (this.boss.hp <= 0) {
          this._killBoss();
        } else {
          window.audioEngine.hit();
          this.screenShake = 3;
        }
      }
    }
  }

  _killEnemy(enemy, index) {
    this.enemies.splice(index, 1);
    this.kills++;
    this.combo++;
    this.comboTimer = this.comboDecay;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const comboMult = Math.min(this.combo, 10);
    const points = enemy.points * comboMult;
    this.score += points;

    // Emit events
    if (this.onScoreChange) this.onScoreChange(this.score);
    if (this.onComboChange) this.onComboChange(this.combo);
    if (this.onEnemyKill) this.onEnemyKill(enemy.type, enemy.targetData, this.combo);

    // VFX
    this._spawnExplosion(enemy.x, enemy.y, enemy.color);
    window.audioEngine.enemyDie();

    // Floating score text
    let killLabel = `+${points}`;
    if (enemy.type === 'email') {
      const act = window.choreOrchestrator && window.choreOrchestrator.config ? window.choreOrchestrator.config.emailAction : 'trash';
      if (act === 'permanent') killLabel = `💥 +${points} PURGED`;
      else if (act === 'trash' || !act) killLabel = `🗑️ +${points} DELETED`;
    }

    this.floatingTexts.push({
      x: enemy.x,
      y: enemy.y,
      text: killLabel,
      color: enemy.color,
      life: 45,
      maxLife: 45
    });

    // Combo milestone effects
    if (this.combo === 5 || this.combo === 10 || this.combo === 20) {
      window.audioEngine.combo();
      this.floatingTexts.push({
        x: this.W / 2,
        y: this.H / 2,
        text: this.combo >= 20 ? '🔥 EXORCISM MODE!' : this.combo >= 10 ? '⚡ MEGA PURGE!' : '✨ DOUBLE BATCH!',
        color: this.combo >= 20 ? '#ff2244' : this.combo >= 10 ? '#ffe600' : '#39ff14',
        life: 60,
        maxLife: 60,
        large: true
      });
    }

    // Random power-up drop
    if (Math.random() < 0.05) {
      this._spawnPowerUp(enemy.x, enemy.y);
    }
  }

  _updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Movement pattern
      switch (e.movePattern) {
        case 'wave':
          e.x += Math.sin(this.frameCount * 0.03 + e.phaseOffset) * 1.5;
          e.y += e.vy;
          break;
        case 'zigzag':
          e.x += Math.sin(this.frameCount * 0.05 + e.phaseOffset) * 2;
          e.y += e.vy;
          break;
        case 'dive':
          if (e.y > this.H * 0.3 && Math.random() < 0.002) {
            e.vy = 3;
          }
          e.y += e.vy;
          e.x += Math.sin(this.frameCount * 0.02 + e.phaseOffset) * 1;
          break;
        default:
          e.y += e.vy;
          e.x += Math.sin(this.frameCount * 0.02 + e.phaseOffset) * 1;
      }

      // Animation
      e.animPhase += 0.05;

      // Shooting
      if (Math.random() < this.enemyShootChance && e.y < this.H * 0.7) {
        this.enemyBullets.push({
          x: e.x,
          y: e.y + e.height / 2,
          vx: (this.player.x - e.x) * 0.01,
          vy: 3 + Math.random() * 2,
          width: 6,
          height: 6,
          color: e.color
        });
      }

      // Remove if off-screen
      if (e.y > this.H + 50) {
        this.enemies.splice(i, 1);
        // Combo break
        this.combo = 0;
        if (this.onComboChange) this.onComboChange(this.combo);
      }

      // Check collision with player
      if (this.invulnFrames <= 0 && this._collides(e, this.player)) {
        this._playerHit();
        this.enemies.splice(i, 1);
      }
    }
  }

  _updateEnemyBullets() {
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.x += b.vx;
      b.y += b.vy;

      if (b.y > this.H + 10 || b.x < -10 || b.x > this.W + 10) {
        this.enemyBullets.splice(i, 1);
        continue;
      }

      if (this.invulnFrames <= 0 && this._collidesPoint(b, this.player)) {
        this._playerHit();
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  _playerHit() {
    if (this.shield > 30) {
      this.shield -= 30;
      if (this.onShieldChange) this.onShieldChange(this.shield);
      this.invulnFrames = 30;
      this.screenShake = 8;
      window.audioEngine.hit();
      this._spawnHitParticles(this.player.x, this.player.y, '#00f0ff', 10);
    } else {
      this.lives--;
      this.shield = 100;
      this.invulnFrames = 90;
      this.screenShake = 15;
      this.combo = 0;

      if (this.onLivesChange) this.onLivesChange(this.lives);
      if (this.onComboChange) this.onComboChange(this.combo);
      if (this.onShieldChange) this.onShieldChange(this.shield);

      if (this.lives <= 0) {
        this._endGame();
      } else {
        window.audioEngine.playerDie();
        this._spawnExplosion(this.player.x, this.player.y, '#00f0ff');
      }
    }
  }

  _endGame() {
    this.gameOver = true;
    window.audioEngine.gameOver();
    this._spawnExplosion(this.player.x, this.player.y, '#ff2244');
    this._spawnExplosion(this.player.x - 20, this.player.y + 10, '#ff00aa');
    this._spawnExplosion(this.player.x + 20, this.player.y - 10, '#ffe600');

    if (this.onGameOver) {
      this.onGameOver({
        score: this.score,
        kills: this.kills,
        maxCombo: this.maxCombo,
        wave: this.wave
      });
    }
  }

  stop() {
    this.running = false;
  }

  // ═══════════════════════════════════════════════════
  // SPAWNING
  // ═══════════════════════════════════════════════════

  _spawnWave() {
    const types = ['email', 'file', 'lint'];
    const configs = {
      email: { color: '#ff2244', points: 10, hp: 1, emoji: '📧', size: 28 },
      file:  { color: '#4488ff', points: 25, hp: 2, emoji: '📁', size: 30 },
      lint:  { color: '#ffe600', points: 15, hp: 1, emoji: '⚠️', size: 26 }
    };
    const patterns = ['wave', 'zigzag', 'dive'];

    const count = Math.min(5 + this.wave * 2, 30);
    const cols = Math.min(Math.ceil(count / 3), 10);
    const rows = Math.ceil(count / cols);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.enemies.length >= count) break;
        const type = types[Math.floor(Math.random() * types.length)];
        const cfg = configs[type];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];

        const spacing = this.W / (cols + 1);
        this.enemies.push({
          x: spacing * (c + 1),
          y: -50 - r * 55,
          width: cfg.size,
          height: cfg.size,
          vy: this.enemySpeed,
          color: cfg.color,
          points: cfg.points,
          hp: cfg.hp + Math.floor(this.wave / 5),
          maxHp: cfg.hp + Math.floor(this.wave / 5),
          type: type,
          emoji: cfg.emoji,
          movePattern: pattern,
          phaseOffset: Math.random() * Math.PI * 2,
          animPhase: Math.random() * Math.PI * 2,
          targetData: window.choreOrchestrator.getTarget(type)
        });
      }
    }
    this.waveEnemies = this.enemies.length;
  }

  _spawnBoss() {
    const bossNames = [
      { name: 'INBOX OVERLORD', size: '2.3GB', path: '~/Mail/Archive' },
      { name: 'CACHE BEHEMOTH', size: '4.1GB', path: 'node_modules/.cache' },
      { name: 'LOG LEVIATHAN', size: '890MB', path: '/var/log/system.log' },
      { name: 'BUILD COLOSSUS', size: '1.7GB', path: 'dist/artifacts' },
      { name: 'DEPENDENCY DAEMON', size: '3.2GB', path: 'vendor/bundle' }
    ];
    const bossData = bossNames[Math.floor(Math.random() * bossNames.length)];

    this.boss = {
      x: this.W / 2,
      y: -80,
      width: 80,
      height: 60,
      hp: 20 + this.wave * 5,
      maxHp: 20 + this.wave * 5,
      color: '#ff00aa',
      targetY: 100,
      phase: 0,
      name: bossData.name,
      data: bossData,
      shootTimer: 0
    };

    this.floatingTexts.push({
      x: this.W / 2,
      y: this.H / 3,
      text: `⚡ ${bossData.name} ⚡`,
      color: '#ff00aa',
      life: 90,
      maxLife: 90,
      large: true
    });

    window.audioEngine.waveStart();
  }

  _updateBoss() {
    const b = this.boss;

    // Move to target position
    if (b.y < b.targetY) {
      b.y += 1;
    }

    // Sine wave movement
    b.phase += 0.02;
    b.x = this.W / 2 + Math.sin(b.phase) * (this.W * 0.3);

    // Boss shooting
    b.shootTimer++;
    if (b.shootTimer > 30) {
      b.shootTimer = 0;
      const angles = [-0.3, -0.15, 0, 0.15, 0.3];
      angles.forEach(a => {
        this.enemyBullets.push({
          x: b.x,
          y: b.y + b.height / 2,
          vx: Math.sin(a) * 3,
          vy: 3,
          width: 8,
          height: 8,
          color: '#ff00aa'
        });
      });
    }
  }

  _killBoss() {
    const boss = this.boss;
    this.score += 500;
    this.kills++;

    // Massive explosion
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this._spawnExplosion(
          boss.x + (Math.random() - 0.5) * 60,
          boss.y + (Math.random() - 0.5) * 40,
          '#ff00aa'
        );
      }, i * 100);
    }

    this.screenShake = 20;
    window.audioEngine.bossDie();

    this.floatingTexts.push({
      x: boss.x,
      y: boss.y,
      text: '+500 BOSS PURGED!',
      color: '#ff00aa',
      life: 80,
      maxLife: 80,
      large: true
    });

    if (this.onBossKill) this.onBossKill(boss.data);
    if (this.onScoreChange) this.onScoreChange(this.score);

    this.boss = null;
    this._spawnPowerUp(boss.x, boss.y);
  }

  _spawnPowerUp(x, y) {
    const types = ['shield', 'speed', 'rapid'];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = { shield: '#00f0ff', speed: '#39ff14', rapid: '#ffe600' };
    const emojis = { shield: '🛡️', speed: '⚡', rapid: '🔥' };

    this.powerUps.push({
      x, y, vy: 1.5,
      width: 20, height: 20,
      type, color: colors[type],
      emoji: emojis[type],
      phase: 0
    });
  }

  _updatePowerUps() {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.y += p.vy;
      p.phase += 0.1;

      if (p.y > this.H + 30) {
        this.powerUps.splice(i, 1);
        continue;
      }

      if (this._collides(p, this.player)) {
        this._applyPowerUp(p);
        this.powerUps.splice(i, 1);
      }
    }
  }

  _applyPowerUp(pu) {
    window.audioEngine.powerUp();
    switch (pu.type) {
      case 'shield':
        this.shield = 100;
        if (this.onShieldChange) this.onShieldChange(this.shield);
        break;
      case 'speed':
        this.player.speed = 8;
        setTimeout(() => { if (this.player) this.player.speed = 5; }, 5000);
        break;
      case 'rapid':
        this.fireRate = 5;
        setTimeout(() => { this.fireRate = 10; }, 5000);
        break;
    }

    this.floatingTexts.push({
      x: pu.x, y: pu.y,
      text: `${pu.emoji} POWER UP!`,
      color: pu.color,
      life: 40, maxLife: 40
    });
  }

  // ═══════════════════════════════════════════════════
  // PARTICLES & VFX
  // ═══════════════════════════════════════════════════

  _spawnExplosion(x, y, color) {
    const count = 25;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = Math.random() * 4 + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 25 + 15,
        maxLife: 40,
        size: Math.random() * 4 + 2,
        color
      });
    }
  }

  _spawnHitParticles(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: Math.random() * 15 + 5,
        maxLife: 20,
        size: Math.random() * 3 + 1,
        color
      });
    }
  }

  _updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  _updateFloatingTexts() {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 0.8;
      ft.life--;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  _updateStars() {
    for (const star of this.stars) {
      star.y += star.speed;
      if (star.y > this.H) {
        star.y = -5;
        star.x = Math.random() * this.W;
      }
    }
  }

  // ═══════════════════════════════════════════════════
  // COLLISION
  // ═══════════════════════════════════════════════════

  _collides(a, b) {
    return (
      a.x - a.width / 2 < b.x + b.width / 2 &&
      a.x + a.width / 2 > b.x - b.width / 2 &&
      a.y - a.height / 2 < b.y + b.height / 2 &&
      a.y + a.height / 2 > b.y - b.height / 2
    );
  }

  _collidesPoint(point, rect) {
    return (
      point.x > rect.x - rect.width / 2 &&
      point.x < rect.x + rect.width / 2 &&
      point.y > rect.y - rect.height / 2 &&
      point.y < rect.y + rect.height / 2
    );
  }

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════

  _render() {
    const ctx = this.ctx;
    ctx.save();

    // Screen shake
    if (this.screenShake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.screenShake,
        (Math.random() - 0.5) * this.screenShake
      );
    }

    // Clear
    ctx.fillStyle = '#000008';
    ctx.fillRect(0, 0, this.W, this.H);

    // Stars
    this._renderStars(ctx);

    // Grid lines (subtle)
    this._renderGrid(ctx);

    // Particles (behind entities)
    this._renderParticles(ctx);

    // Power-ups
    this._renderPowerUps(ctx);

    // Enemies
    this._renderEnemies(ctx);

    // Boss
    if (this.boss) this._renderBoss(ctx);

    // Player bullets
    this._renderBullets(ctx);

    // Enemy bullets
    this._renderEnemyBullets(ctx);

    // Player
    if (!this.gameOver) this._renderPlayer(ctx);

    // Floating texts
    this._renderFloatingTexts(ctx);

    // Wave clear text
    if (this.waveCleared && this.waveCooldown > 30) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'bold 24px "Orbitron"';
      ctx.fillStyle = '#39ff14';
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 20;
      ctx.fillText(`WAVE ${this.wave} CLEARED`, this.W / 2, this.H / 2);
      ctx.restore();
    }

    ctx.restore();
  }

  _renderStars(ctx) {
    for (const star of this.stars) {
      ctx.globalAlpha = star.brightness;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }

  _renderGrid(ctx) {
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    const offset = (this.frameCount * 0.5) % gridSize;
    for (let y = offset; y < this.H; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.W, y);
      ctx.stroke();
    }
  }

  _renderPlayer(ctx) {
    const p = this.player;

    // Invulnerability flash
    if (this.invulnFrames > 0 && this.frameCount % 6 < 3) return;

    ctx.save();
    ctx.translate(p.x, p.y);

    // Thruster glow
    const thrustIntensity = 0.5 + Math.sin(p.thrusterPhase) * 0.3;
    ctx.fillStyle = `rgba(0, 240, 255, ${thrustIntensity * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(-8, p.height / 2);
    ctx.lineTo(8, p.height / 2);
    ctx.lineTo(0, p.height / 2 + 15 + Math.sin(p.thrusterPhase) * 5);
    ctx.closePath();
    ctx.fill();

    // Ship body - sleek triangle
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 15;

    // Main hull
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(0, -p.height / 2);
    ctx.lineTo(-p.width / 2, p.height / 2);
    ctx.lineTo(-p.width / 4, p.height / 3);
    ctx.lineTo(0, p.height / 2 - 5);
    ctx.lineTo(p.width / 4, p.height / 3);
    ctx.lineTo(p.width / 2, p.height / 2);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Wing accents
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(-p.width / 2 + 5, p.height / 2 - 5);
    ctx.lineTo(-5, -p.height / 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.width / 2 - 5, p.height / 2 - 5);
    ctx.lineTo(5, -p.height / 4);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  _renderEnemies(ctx) {
    for (const e of this.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);

      // Glow
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 12;

      // Ghost body - wobbly shape
      const wobble = Math.sin(e.animPhase) * 3;
      const s = e.width / 2;

      ctx.fillStyle = e.color;
      ctx.globalAlpha = 0.8;

      ctx.beginPath();
      ctx.arc(0, -s * 0.2, s, Math.PI, 0, false);
      ctx.lineTo(s, s * 0.6);
      // Wavy bottom
      for (let i = 0; i <= 4; i++) {
        const wx = s - (i * s * 2) / 4;
        const wy = s * 0.6 + (i % 2 === 0 ? 5 + wobble : -2 + wobble);
        ctx.lineTo(wx, wy);
      }
      ctx.closePath();
      ctx.fill();

      // Eyes
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-s * 0.3, -s * 0.2, s * 0.2, 0, Math.PI * 2);
      ctx.arc(s * 0.3, -s * 0.2, s * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Pupils (look at player)
      const dx = this.player.x - e.x;
      const lookDir = Math.sign(dx);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-s * 0.3 + lookDir * 2, -s * 0.2, s * 0.1, 0, Math.PI * 2);
      ctx.arc(s * 0.3 + lookDir * 2, -s * 0.2, s * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Type label
      ctx.shadowBlur = 0;
      ctx.font = `${Math.max(8, s * 0.5)}px "Press Start 2P"`;
      ctx.textAlign = 'center';
      ctx.fillStyle = e.color;
      ctx.globalAlpha = 0.6;
      ctx.fillText(e.emoji, 0, s + 14);

      // Health bar for multi-hp enemies
      if (e.maxHp > 1) {
        const barW = e.width;
        const barH = 3;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#333';
        ctx.fillRect(-barW / 2, -s - 8, barW, barH);
        ctx.fillStyle = e.color;
        ctx.fillRect(-barW / 2, -s - 8, barW * (e.hp / e.maxHp), barH);
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  _renderBoss(ctx) {
    const b = this.boss;
    ctx.save();
    ctx.translate(b.x, b.y);

    // Aura
    const auraPhase = Math.sin(this.frameCount * 0.05) * 0.3 + 0.5;
    ctx.fillStyle = `rgba(255, 0, 170, ${auraPhase * 0.15})`;
    ctx.beginPath();
    ctx.arc(0, 0, b.width, 0, Math.PI * 2);
    ctx.fill();

    // Boss body
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 25;
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.9;

    const s = b.width / 2;
    ctx.beginPath();
    ctx.arc(0, -s * 0.3, s, Math.PI, 0, false);
    ctx.lineTo(s, s * 0.4);
    // More dramatic wave bottom
    for (let i = 0; i <= 6; i++) {
      const wx = s - (i * s * 2) / 6;
      const wobble = Math.sin(this.frameCount * 0.1 + i) * 6;
      const wy = s * 0.4 + (i % 2 === 0 ? 10 + wobble : -4 + wobble);
      ctx.lineTo(wx, wy);
    }
    ctx.closePath();
    ctx.fill();

    // Boss eyes - larger, menacing
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(-s * 0.35, -s * 0.3, s * 0.22, s * 0.28, 0, 0, Math.PI * 2);
    ctx.ellipse(s * 0.35, -s * 0.3, s * 0.22, s * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red pupils
    ctx.fillStyle = '#ff0000';
    const dx = this.player.x - b.x;
    const lookDir = Math.sign(dx);
    ctx.beginPath();
    ctx.arc(-s * 0.35 + lookDir * 3, -s * 0.3, s * 0.12, 0, Math.PI * 2);
    ctx.arc(s * 0.35 + lookDir * 3, -s * 0.3, s * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Boss name
    ctx.shadowBlur = 0;
    ctx.font = '9px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff00aa';
    ctx.fillText(b.name, 0, -s - 15);

    // Health bar
    const barW = b.width * 1.5;
    const barH = 6;
    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(-barW / 2, -s - 10, barW, barH);
    const hpFrac = b.hp / b.maxHp;
    const barColor = hpFrac > 0.5 ? '#ff00aa' : hpFrac > 0.25 ? '#ffe600' : '#ff2244';
    ctx.fillStyle = barColor;
    ctx.fillRect(-barW / 2, -s - 10, barW * hpFrac, barH);

    ctx.restore();
  }

  _renderBullets(ctx) {
    for (const b of this.bullets) {
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);

      // Trail
      ctx.globalAlpha = 0.3;
      ctx.fillRect(b.x - b.width / 4, b.y, b.width / 2, b.height);
      ctx.restore();
    }
  }

  _renderEnemyBullets(ctx) {
    for (const b of this.enemyBullets) {
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _renderParticles(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 5;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  _renderPowerUps(ctx) {
    for (const p of this.powerUps) {
      ctx.save();
      ctx.translate(p.x, p.y);

      // Glow ring
      const pulse = Math.sin(p.phase) * 0.3 + 0.7;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = pulse * 0.5;
      ctx.lineWidth = 2;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, p.width / 2 + 5, 0, Math.PI * 2);
      ctx.stroke();

      // Icon
      ctx.globalAlpha = 1;
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);

      ctx.restore();
    }
  }

  _renderFloatingTexts(ctx) {
    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = ft.color;
      if (ft.large) {
        ctx.font = 'bold 20px "Orbitron"';
      } else {
        ctx.font = 'bold 11px "Press Start 2P"';
      }
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}

window.DigitalExorcistGame = DigitalExorcistGame;
