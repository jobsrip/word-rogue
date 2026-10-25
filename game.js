/**
 * WORD ROGUE // Main Game Arena Simulation (V2)
 * Features:
 * - Dual-layout input (Works seamlessly on Russian AND English keyboard!)
 * - Visible bottom interactive input box + visual blinking cursor
 * - Glowing letter feedback
 * - Visual target line connecting hero to targeted enemy
 */

class WordRogueGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.audio = new window.SoundEngine();

    this.width = 960;
    this.height = 540;

    // Game Progression
    this.floor = 1;
    this.maxFloor = 5;
    this.state = 'BATTLE'; // BATTLE, PERK_SELECTION, VICTORY, GAME_OVER

    // Hero Stats
    this.hero = {
      hp: 100,
      maxHp: 100,
      shield: 0,
      maxShield: 0,
      baseAtk: 22,
      critChance: 0.15,
      lifesteal: 0,
      potions: 1,
      lvl: 1,
      exp: 0,
      nextExp: 50,
      alive: true
    };

    // Live Metrics
    this.totalTyped = 0;
    this.correctTyped = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.wpm = 0;
    this.accuracy = 100;
    this.startTime = null;
    this.score = 0;

    // Current input buffer visualization
    this.currentBuffer = '';
    this.lastInputFeedback = '';
    this.lastInputTimer = 0;

    // Battle Entities
    this.enemies = [];
    this.activeEnemy = null; // Currently locked target
    this.lasers = [];
    this.particles = [];
    this.damageNumbers = [];
    this.screenShake = 0;

    this.perkOptions = [];

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initKeyboard();

    this.startFloor(1);
    this.loop();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.renderScale = rect.width / this.width;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Translates whatever user typed to both Russian and English matches
  normalizeChar(rawChar) {
    const low = rawChar.toLowerCase();
    const mappedRu = window.KEY_MAP_EN_TO_RU[low] || low;
    const mappedEn = window.KEY_MAP_RU_TO_EN[low] || low;
    return { raw: low, ru: mappedRu, en: mappedEn };
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.audio.ensure();
      if (!this.startTime) this.startTime = performance.now();

      // Quick restart
      if (e.code === 'KeyR' && (this.state === 'GAME_OVER' || this.state === 'VICTORY')) {
        this.restartGame();
        return;
      }
      if (e.code === 'KeyM' && e.ctrlKey) {
        this.audio.toggleMute();
        return;
      }

      // Quick Potion (Tab or 1)
      if ((e.code === 'Tab' || e.code === 'Digit1') && this.state === 'BATTLE') {
        e.preventDefault();
        this.usePotion();
        return;
      }

      // Perk Selection (1, 2, 3)
      if (this.state === 'PERK_SELECTION') {
        if (e.code === 'Digit1' || e.code === 'KeyA') this.pickPerk(0);
        else if (e.code === 'Digit2' || e.code === 'KeyB') this.pickPerk(1);
        else if (e.code === 'Digit3' || e.code === 'KeyC') this.pickPerk(2);
        return;
      }

      // Only battle keys
      if (this.state !== 'BATTLE') return;

      // Check if letter key
      if (e.key.length === 1) {
        const charObj = this.normalizeChar(e.key);
        this.handleTyping(charObj);
      }
    });
  }

  handleTyping(charObj) {
    this.totalTyped++;

    // 1. If currently locked onto an enemy
    if (this.activeEnemy && this.activeEnemy.alive) {
      const nextChar = this.activeEnemy.word[this.activeEnemy.typedIndex];
      // Match either direct character or layout-mapped character!
      if (charObj.raw === nextChar || charObj.ru === nextChar || charObj.en === nextChar) {
        // Correct letter!
        this.activeEnemy.typedIndex++;
        this.correctTyped++;
        this.streak++;
        if (this.streak > this.maxStreak) this.maxStreak = this.streak;

        this.currentBuffer += nextChar;
        this.lastInputFeedback = 'HIT';
        this.lastInputTimer = 0.4;

        this.audio.keyTap(true);
        this.fireSlashLaser(this.activeEnemy);

        // Word completed!
        if (this.activeEnemy.typedIndex >= this.activeEnemy.word.length) {
          this.executeWordAttack(this.activeEnemy);
          this.currentBuffer = '';
        }
      } else {
        // Typo mistake!
        this.audio.keyTap(false);
        this.streak = 0;
        this.screenShake = 4;
        this.lastInputFeedback = 'MISS';
        this.lastInputTimer = 0.4;
        this.addDamageNumber('ПРОМАХ!', this.activeEnemy.x, this.activeEnemy.y - 40, '#ff0055');
      }
    } else {
      // 2. Not locked: find enemy whose upcoming word begins with typed char (or layout-mapped char)
      let candidate = null;
      let minAttackTime = 9999;

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const firstLetter = enemy.word[0];
        if (charObj.raw === firstLetter || charObj.ru === firstLetter || charObj.en === firstLetter) {
          if (enemy.attackTimer < minAttackTime) {
            minAttackTime = enemy.attackTimer;
            candidate = enemy;
          }
        }
      }

      if (candidate) {
        this.activeEnemy = candidate;
        this.activeEnemy.typedIndex = 1;
        this.correctTyped++;
        this.streak++;
        if (this.streak > this.maxStreak) this.maxStreak = this.streak;

        this.currentBuffer = candidate.word[0];
        this.lastInputFeedback = 'HIT';
        this.lastInputTimer = 0.4;

        this.audio.keyTap(true);
        this.fireSlashLaser(this.activeEnemy);

        if (this.activeEnemy.typedIndex >= this.activeEnemy.word.length) {
          this.executeWordAttack(this.activeEnemy);
          this.currentBuffer = '';
        }
      } else {
        // No enemy starts with this letter
        this.audio.keyTap(false);
        this.streak = 0;
        this.lastInputFeedback = 'MISS';
        this.lastInputTimer = 0.3;
      }
    }

    this.calculateWpm();
  }

  executeWordAttack(enemy) {
    const isCrit = Math.random() < this.hero.critChance;
    let dmg = this.hero.baseAtk * (isCrit ? 2.5 : 1.0);
    if (this.hero.comboBonus && this.streak >= 15) dmg *= 1.5;

    dmg = Math.round(dmg + enemy.word.length * 3);
    enemy.hp -= dmg;

    this.audio.wordStrike(isCrit);
    this.screenShake = isCrit ? 12 : 6;
    this.createSlashBurst(enemy.x, enemy.y, isCrit);

    this.addDamageNumber(isCrit ? `КРИТ -${dmg}` : `-${dmg}`, enemy.x, enemy.y - 30, isCrit ? '#ff0055' : '#00ffff');

    // Lifesteal perk
    if (this.hero.lifesteal > 0) {
      this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + this.hero.lifesteal);
      this.addDamageNumber(`+${this.hero.lifesteal} HP`, 140, 260, '#00ff66');
    }

    if (enemy.hp <= 0) {
      enemy.alive = false;
      this.audio.enemyKill();
      this.addDamageNumber(`ПОВЕРЖЕН! +${enemy.exp} EXP`, enemy.x, enemy.y - 10, '#facc15');
      this.gainExp(enemy.exp);
      this.score += enemy.exp * 10;
      this.activeEnemy = null;

      // Check floor clear
      if (this.enemies.every(e => !e.alive)) {
        setTimeout(() => this.floorCleared(), 600);
      }
    } else {
      // Enemy survived: assign next word to finish off!
      enemy.word = this.getWordForEnemy(enemy.tier);
      enemy.typedIndex = 0;
      this.activeEnemy = null;
    }
  }

  fireSlashLaser(enemy) {
    this.lasers.push({
      x1: 180,
      y1: 280,
      x2: enemy.x,
      y2: enemy.y,
      life: 0.12,
      color: '#00f3ff'
    });
  }

  createSlashBurst(x, y, isCrit) {
    for (let i = 0; i < (isCrit ? 25 : 14); i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 220;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: 2 + Math.random() * 3,
        color: isCrit ? '#ff0055' : '#00f3ff',
        life: 0.4
      });
    }
  }

  addDamageNumber(text, x, y, color) {
    this.damageNumbers.push({ text, x, y, vy: -35, life: 1.1, color });
  }

  calculateWpm() {
    if (this.totalTyped > 0) {
      this.accuracy = Math.round((this.correctTyped / this.totalTyped) * 100);
    }
    if (this.startTime) {
      const mins = Math.max(0.01, (performance.now() - this.startTime) / 60000);
      this.wpm = Math.round((this.correctTyped / 5) / mins);
      this.audio.setWpmSpeed(this.wpm);
    }
  }

  usePotion() {
    if (this.hero.potions <= 0) {
      this.addDamageNumber('НЕТ ЗЕЛИЙ!', 140, 260, '#ff0033');
      return;
    }
    this.hero.potions--;
    const heal = 45;
    this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + heal);
    this.audio.heal();
    this.addDamageNumber(`+${heal} HP!`, 140, 260, '#00ff66');
  }

  gainExp(amount) {
    this.hero.exp += amount;
    if (this.hero.exp >= this.hero.nextExp) {
      this.hero.lvl++;
      this.hero.exp -= this.hero.nextExp;
      this.hero.nextExp = Math.floor(this.hero.nextExp * 1.5);
      this.hero.maxHp += 15;
      this.hero.hp = this.hero.maxHp;
      this.hero.baseAtk += 5;
      this.audio.levelUp();
      this.addDamageNumber('LEVEL UP!', 140, 230, '#facc15');
    }
  }

  // --- FLOOR & SPAWNING ---

  startFloor(fl) {
    this.floor = fl;
    this.state = 'BATTLE';
    this.activeEnemy = null;
    this.currentBuffer = '';
    this.hero.shield = this.hero.maxShield;

    const isBossFloor = (this.floor === this.maxFloor);

    if (isBossFloor) {
      this.enemies = [{
        name: 'ТИТАН БЕЗДНЫ',
        tier: 'boss',
        word: this.getWordForEnemy('boss'),
        typedIndex: 0,
        x: 680,
        y: 270,
        hp: 340,
        maxHp: 340,
        atk: 28,
        exp: 300,
        attackTimer: 7.0,
        maxAttackTimer: 7.0,
        radius: 65,
        alive: true,
        isBoss: true
      }];
    } else {
      const count = 2 + (this.floor >= 3 ? 1 : 0);
      const enemyNames = ['Горгулья', 'Темный Маг', 'Орк-Палач', 'Призрак Разлома', 'Железный Голем'];
      this.enemies = [];

      for (let i = 0; i < count; i++) {
        const tier = this.floor <= 2 ? 'tier1' : (Math.random() < 0.6 ? 'tier2' : 'tier3');
        const hp = 40 + this.floor * 25 + i * 15;
        this.enemies.push({
          name: enemyNames[(this.floor + i) % enemyNames.length],
          tier,
          word: this.getWordForEnemy(tier),
          typedIndex: 0,
          x: 580 + (i % 2) * 160,
          y: 160 + i * 120,
          hp,
          maxHp: hp,
          atk: 10 + this.floor * 4,
          exp: 30 + this.floor * 15,
          attackTimer: 4.5 + Math.random() * 2.5,
          maxAttackTimer: 5.0,
          radius: 32,
          alive: true
        });
      }
    }
  }

  getWordForEnemy(tier) {
    const bank = window.WORD_BANK.ru;
    const pool = bank[tier] || bank.tier1;
    const available = pool.filter(w => !this.enemies.some(e => e.alive && e.word === w));
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  floorCleared() {
    if (this.floor >= this.maxFloor) {
      this.state = 'VICTORY';
      this.audio.levelUp();
    } else {
      this.state = 'PERK_SELECTION';
      const shuffled = [...window.PERKS_POOL].sort(() => 0.5 - Math.random());
      this.perkOptions = shuffled.slice(0, 3);
    }
  }

  pickPerk(idx) {
    const perk = this.perkOptions[idx];
    if (perk) {
      perk.apply(this.hero);
      this.audio.levelUp();
      this.startFloor(this.floor + 1);
    }
  }

  restartGame() {
    this.floor = 1;
    this.hero = {
      hp: 100,
      maxHp: 100,
      shield: 0,
      maxShield: 0,
      baseAtk: 22,
      critChance: 0.15,
      lifesteal: 0,
      potions: 1,
      lvl: 1,
      exp: 0,
      nextExp: 50,
      alive: true
    };
    this.totalTyped = 0;
    this.correctTyped = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.startTime = null;
    this.score = 0;
    this.startFloor(1);
  }

  // --- UPDATE LOOP ---

  update(dt) {
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }
    if (this.lastInputTimer > 0) {
      this.lastInputTimer -= dt;
    }

    if (this.state !== 'BATTLE') return;

    // Enemy Attack Timers
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.attackTimer -= dt;

      if (enemy.attackTimer <= 0) {
        enemy.attackTimer = enemy.maxAttackTimer;
        this.enemyStrikeHero(enemy);
      }
    }

    // Update Lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.life -= dt;
      if (l.life <= 0) this.lasers.splice(i, 1);
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Update Damage Numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.y += d.vy * dt;
      d.life -= dt;
      if (d.life <= 0) this.damageNumbers.splice(i, 1);
    }
  }

  enemyStrikeHero(enemy) {
    let dmg = enemy.atk;

    // Shield absorb
    if (this.hero.shield > 0) {
      const absorbed = Math.min(this.hero.shield, dmg);
      this.hero.shield -= absorbed;
      dmg -= absorbed;
      this.addDamageNumber(`ЩИТ -${absorbed}`, 140, 240, '#38bdf8');
    }

    if (dmg > 0) {
      this.hero.hp -= dmg;
      this.audio.playerHurt();
      this.screenShake = 14;
      this.streak = 0;
      this.addDamageNumber(`-${dmg} HP`, 140, 280, '#ff0033');

      if (this.hero.hp <= 0) {
        this.hero.hp = 0;
        this.hero.alive = false;
        this.state = 'GAME_OVER';
        this.audio.playerHurt();
      }
    }
  }

  // --- RENDER PASS ---

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Dark Obsidian Arena Backdrop
    ctx.fillStyle = '#06050a';
    ctx.fillRect(0, 0, w, h);

    // Apply Screen Shake
    ctx.save();
    if (this.screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
    }

    // Arena Floor Geometry Grid
    ctx.strokeStyle = '#161126';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Laser Blade Beams
    for (const l of this.lasers) {
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    }

    // Target laser line from Hero to active enemy
    if (this.activeEnemy && this.activeEnemy.alive) {
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(180, 280);
      ctx.lineTo(this.activeEnemy.x, this.activeEnemy.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 1. Render Hero on Left
    this.renderHero(ctx);

    // 2. Render Enemies on Right
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      this.renderEnemy(ctx, enemy);
    }

    // 3. Particles
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Damage Numbers
    for (const d of this.damageNumbers) {
      ctx.font = '700 15px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, d.x, d.y);
    }

    ctx.restore();

    // 5. Bottom Interactive Typing Bar (Shows what player is typing!)
    this.renderBottomTypingBar(ctx, w, h);

    // 6. Overlays
    if (this.state === 'PERK_SELECTION') {
      this.renderPerkModal(ctx, w, h);
    } else if (this.state === 'GAME_OVER') {
      this.renderGameOver(ctx, w, h);
    } else if (this.state === 'VICTORY') {
      this.renderVictory(ctx, w, h);
    }
  }

  renderHero(ctx) {
    const hx = 180, hy = 280;

    // Platform ring
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(hx, hy + 35, 45, 14, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Shield aura
    if (this.hero.shield > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hx, hy, 44, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hero Avatar
    ctx.fillStyle = '#00f3ff';
    ctx.beginPath();
    ctx.arc(hx, hy, 26, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(hx + 8, hy - 4, 6, 0, Math.PI * 2);
    ctx.fill();

    // Hero Name & Level
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`СЛОВЕСНЫЙ СТРАЖ [УР. ${this.hero.lvl}]`, hx, hy - 50);

    // Hero HP Bar
    const hpW = 110;
    ctx.fillStyle = '#1c0e2a';
    ctx.fillRect(hx - hpW / 2, hy - 42, hpW, 8);
    ctx.fillStyle = this.hero.hp > 30 ? '#00ff66' : '#ff0033';
    ctx.fillRect(hx - hpW / 2, hy - 42, (this.hero.hp / this.hero.maxHp) * hpW, 8);
    ctx.strokeStyle = '#382154';
    ctx.strokeRect(hx - hpW / 2, hy - 42, hpW, 8);
  }

  renderEnemy(ctx, enemy) {
    const isTargeted = (this.activeEnemy === enemy);

    // Platform ring
    ctx.strokeStyle = isTargeted ? 'rgba(0, 243, 255, 0.7)' : 'rgba(255, 0, 85, 0.3)';
    ctx.lineWidth = isTargeted ? 2 : 1;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + enemy.radius + 6, enemy.radius * 1.2, enemy.radius * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Enemy Avatar Body
    ctx.fillStyle = enemy.isBoss ? '#a855f7' : (isTargeted ? '#ff0055' : '#e11d48');
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.isBoss) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // Name & HP Bar
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fecdd3';
    ctx.fillText(`${enemy.name}`, enemy.x, enemy.y - enemy.radius - 22);

    const barW = enemy.isBoss ? 160 : 80;
    ctx.fillStyle = '#260a14';
    ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 18, barW, 6);
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 18, (enemy.hp / enemy.maxHp) * barW, 6);

    // Attack Countdown Timer Line
    const timerRatio = enemy.attackTimer / enemy.maxAttackTimer;
    ctx.fillStyle = timerRatio < 0.3 ? '#ff0033' : '#facc15';
    ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 11, barW * timerRatio, 3);

    // --- WORD PROMPT ---
    const word = enemy.word;
    const typedIdx = enemy.typedIndex;

    ctx.font = '700 18px "JetBrains Mono", monospace';
    const totalW = ctx.measureText(word).width;

    // Word Pill Background
    ctx.fillStyle = 'rgba(10, 6, 18, 0.9)';
    ctx.fillRect(enemy.x - totalW / 2 - 10, enemy.y + enemy.radius + 16, totalW + 20, 26);
    ctx.strokeStyle = isTargeted ? '#00f3ff' : '#ff0055';
    ctx.lineWidth = isTargeted ? 2.5 : 1;
    ctx.strokeRect(enemy.x - totalW / 2 - 10, enemy.y + enemy.radius + 16, totalW + 20, 26);

    // Draw characters: Typed = Glowing Green, Remaining = Crisp White
    ctx.textAlign = 'left';
    let drawX = enemy.x - totalW / 2;
    const textY = enemy.y + enemy.radius + 35;

    const typedStr = word.substring(0, typedIdx);
    const remStr = word.substring(typedIdx);

    ctx.fillStyle = '#00ff66';
    ctx.fillText(typedStr, drawX, textY);

    const typedW = ctx.measureText(typedStr).width;
    ctx.fillStyle = isTargeted ? '#ffffff' : '#94a3b8';
    ctx.fillText(remStr, drawX + typedW, textY);
  }

  renderBottomTypingBar(ctx, w, h) {
    const boxW = 540;
    const boxH = 46;
    const boxX = w / 2 - boxW / 2;
    const boxY = h - 68;

    // Frame
    ctx.fillStyle = 'rgba(14, 10, 24, 0.95)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = this.activeEnemy ? '#00f3ff' : '#2e1d4a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Keyboard icon / prompt
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ВВОД С КЛАВИАТУРЫ:', boxX + 16, boxY + 28);

    // Current word being typed
    ctx.font = '700 18px "JetBrains Mono", monospace';
    if (this.activeEnemy && this.activeEnemy.alive) {
      const fullWord = this.activeEnemy.word;
      const typed = fullWord.substring(0, this.activeEnemy.typedIndex);
      const remaining = fullWord.substring(this.activeEnemy.typedIndex);

      let textStartX = boxX + 190;
      ctx.fillStyle = '#00ff66';
      ctx.fillText(typed, textStartX, boxY + 29);

      const typedW = ctx.measureText(typed).width;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(remaining, textStartX + typedW, boxY + 29);

      // Blinking cursor
      if (Math.floor(performance.now() / 400) % 2 === 0) {
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(textStartX + typedW, boxY + 14, 2, 20);
      }
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.fillText('нажимай буквы слова любого врага (RU или EN раскладка)...', boxX + 185, boxY + 28);
    }
  }

  renderPerkModal(ctx, w, h) {
    ctx.fillStyle = 'rgba(6, 4, 10, 0.88)';
    ctx.fillRect(0, 0, w, h);

    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#facc15';
    ctx.fillText(`ЭТАЖ ${this.floor} ЗАЧИЩЕН // ВЫБЕРИ НАГРАДУ РОГАЛИКА:`, w / 2, 90);

    const cardW = 240, cardH = 260;
    const startX = w / 2 - (3 * cardW + 2 * 20) / 2;

    this.perkOptions.forEach((perk, i) => {
      const cx = startX + i * (cardW + 20);
      const cy = 150;

      ctx.fillStyle = 'rgba(18, 12, 32, 0.95)';
      ctx.fillRect(cx, cy, cardW, cardH);
      ctx.strokeStyle = '#3b255e';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cardW, cardH);

      // Icon
      ctx.font = '40px sans-serif';
      ctx.fillText(perk.icon, cx + cardW / 2, cy + 65);

      // Number key badge
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillStyle = '#00f3ff';
      ctx.fillText(`[НАЖМИ ${i + 1}]`, cx + cardW / 2, cy + 115);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 14px "JetBrains Mono", monospace';
      ctx.fillText(perk.title, cx + cardW / 2, cy + 150);

      // Description (wrapped)
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      this.wrapText(ctx, perk.desc, cx + cardW / 2, cy + 185, cardW - 30, 18);
    });
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  renderGameOver(ctx, w, h) {
    ctx.fillStyle = 'rgba(6, 4, 10, 0.9)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.font = '700 36px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ff0033';
    ctx.fillText('ТЫ ПАЛ В БОЮ // СМЕРТЬ', w / 2, h / 2 - 20);
    ctx.font = '15px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00f3ff';
    ctx.fillText(`СКОРОСТЬ: ${this.wpm} WPM  |  СЧЕТ: ${this.score}  |  ЭТАЖ: ${this.floor}`, w / 2, h / 2 + 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('НАЖМИ [R] ДЛЯ НОВОГО ЗАБЕГА', w / 2, h / 2 + 55);
  }

  renderVictory(ctx, w, h) {
    ctx.fillStyle = 'rgba(6, 4, 10, 0.9)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.font = '700 36px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00ff66';
    ctx.fillText('ТИТАН ПОВЕРЖЕН // ПОБЕДА!', w / 2, h / 2 - 20);
    ctx.font = '15px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00f3ff';
    ctx.fillText(`РЕКОРДНАЯ СКОРОСТЬ: ${this.wpm} WPM  |  СЧЕТ: ${this.score}`, w / 2, h / 2 + 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('НАЖМИ [R] ДЛЯ НОВОГО ПОХОДА', w / 2, h / 2 + 55);
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.update(dt);
    this.render();
    this.updateHUD();
  }

  updateHUD() {
    const wpmEl = document.getElementById('stat-wpm');
    const accEl = document.getElementById('stat-acc');
    const streakEl = document.getElementById('stat-streak');
    const floorEl = document.getElementById('stat-floor');
    const potionsEl = document.getElementById('stat-potions');

    if (wpmEl) wpmEl.textContent = `${this.wpm} WPM`;
    if (accEl) accEl.textContent = `${this.accuracy}%`;
    if (streakEl) streakEl.textContent = `x${this.streak}`;
    if (floorEl) floorEl.textContent = `${this.floor}/${this.maxFloor}`;
    if (potionsEl) potionsEl.textContent = `${this.hero.potions} [TAB]`;
  }
}

window.WordRogueGame = WordRogueGame;
