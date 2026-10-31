/**
 * ═══════════════════════════════════════════════════════
 * DIGITAL EXORCIST — Chore Orchestrator v2.0
 * Translates arcade game kills into real or simulated
 * background chore executions — with SPAM DELETION.
 * ═══════════════════════════════════════════════════════
 */

class ChoreOrchestrator {
  constructor() {
    this.stats = {
      emailsDeleted: 0,
      emailsArchived: 0,
      filesCleaned: 0,
      lintFixes: 0,
      totalChores: 0,
      batchesSent: 0
    };

    this.pendingBatch = {
      emails: [],
      files: [],
      lints: []
    };

    this.batchTimer = null;
    this.batchDelay = 700; // ms — batch window for combo optimization

    // Config options (loaded from localStorage or defaults)
    this.config = this._loadConfig();

    // Simulated data pools
    this.emailPool = this._generateEmailPool();
    this.filePool = this._generateFilePool();
    this.lintPool = this._generateLintPool();

    this.onChoreExecuted = null; // callback for UI feed
    this.apiBase = window.location.origin; // Same host or port
  }

  _loadConfig() {
    try {
      const saved = localStorage.getItem('digital_exorcist_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return {
      emailAction: 'trash', // 'trash' | 'permanent' | 'archive'
      connectionMode: 'simulated', // 'simulated' | 'live'
      email: '',
      password: '',
      confirmSpamDelete: true,
      targetLabels: ['Spam', 'Promotions']
    };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem('digital_exorcist_config', JSON.stringify(this.config));
    } catch (e) {}
  }

  _generateEmailPool() {
    const spamSenders = [
      'claims@lottery-winner-intl.xyz',
      'urgent-security@paypal-account-verify.net',
      'crypto-airdrop@free-sol-giveaway.io',
      'vip-casino@bonus-slots-jackpot.biz',
      'prince.aliko@nigeria-royal-fund.org',
      'invoice-unpaid@overdue-billing-dept.cc',
      'cheap-rx-meds@pharmacy-discount-24.com',
      'apple-id-alert@icloud-security-check.info',
      'hot-singles@dating-matches-local.club',
      'amazon-refund@gift-order-confirmation.me',
      'wire-transfer@western-escrow-hold.link',
      'irs-audit-notice@tax-settlement-gov.us',
      'fast-cash-loan@no-credit-approval.online',
      'deals@junk-promotions-daily.biz',
      'newsletter@marketing-spam-blaster.co'
    ];

    const spamSubjects = [
      '🚨 FINAL NOTICE: Your $4,500,000 claim is pending release',
      '⚠️ Security Alert: Unauthorized sign-in attempt detected',
      '🎉 Congratulations! You won the Apple iPhone 16 Pro raffle',
      '⚡ 500 FREE SPINS added to your casino wallet',
      'Confidential Proposal: Immediate funds transfer request',
      'Overdue Payment Reminder: Invoice #98421 attached',
      'Save 80% on prescription meds — overnight shipping',
      'Your account will be suspended within 24 hours',
      '3 new matches nearby want to chat with you tonight',
      'URGENT: Verify your billing info to avoid tax penalty',
      'Instant $50,000 personal loan approved — claim now',
      '🔥 Flash Sale: 90% off all designer sunglasses today only'
    ];

    return spamSenders.map((sender, i) => ({
      id: `msg_spam_${Date.now()}_${i}`,
      sender,
      subject: spamSubjects[i % spamSubjects.length],
      size: Math.floor(Math.random() * 250 + 15) + 'KB',
      age: Math.floor(Math.random() * 30 + 1) + 'd ago',
      isSpam: true
    }));
  }

  _generateFilePool() {
    const files = [
      { name: 'report_draft_v3_final_FINAL.docx', dir: '~/Downloads', size: '4.2MB' },
      { name: 'node_modules/.cache/babel-loader/hash_a8f2e.json', dir: 'project', size: '128KB' },
      { name: 'screenshot_2024_03_15.png', dir: '~/Downloads', size: '2.1MB' },
      { name: '.DS_Store', dir: '~/Desktop', size: '6KB' },
      { name: 'npm-debug.log', dir: 'project', size: '340KB' },
      { name: 'package-lock.json.bak', dir: 'project', size: '890KB' },
      { name: 'Untitled-1.txt', dir: '~/Desktop', size: '0KB' },
      { name: 'image (3).jpeg', dir: '~/Downloads', size: '3.4MB' },
      { name: '.eslintcache', dir: 'project', size: '45KB' },
      { name: 'coverage/lcov.info', dir: 'project', size: '210KB' },
      { name: 'dist/bundle.js.map', dir: 'project', size: '1.8MB' },
      { name: 'yarn-error.log', dir: 'project', size: '78KB' },
      { name: 'thumbs.db', dir: '~/Desktop', size: '12KB' },
      { name: 'video_recording_zoom.mp4', dir: '~/Downloads', size: '156MB' },
      { name: '.next/cache/webpack/client-dev.pack', dir: 'project', size: '48MB' },
      { name: 'Invoice_March_2024.pdf', dir: '~/Downloads', size: '1.2MB' }
    ];

    return files.map((f, i) => ({
      id: `file_${Date.now()}_${i}`,
      ...f
    }));
  }

  _generateLintPool() {
    const issues = [
      { rule: 'no-unused-vars', file: 'src/app.js:42', fix: 'Removed unused import' },
      { rule: 'semi', file: 'src/utils.ts:18', fix: 'Added missing semicolon' },
      { rule: 'prefer-const', file: 'src/hooks.js:7', fix: 'Changed let to const' },
      { rule: 'eqeqeq', file: 'lib/auth.js:33', fix: 'Changed == to ===' },
      { rule: 'no-console', file: 'src/api.ts:56', fix: 'Wrapped in debug check' },
      { rule: 'indent', file: 'src/index.js:12', fix: 'Fixed indentation' },
      { rule: 'quotes', file: 'config/db.js:8', fix: 'Normalized to single quotes' },
      { rule: 'comma-dangle', file: 'src/types.ts:29', fix: 'Added trailing comma' },
      { rule: 'arrow-parens', file: 'src/utils.js:44', fix: 'Added arrow parens' },
      { rule: 'no-var', file: 'legacy/old.js:5', fix: 'Changed var to let' }
    ];

    return issues.map((iss, i) => ({
      id: `lint_${Date.now()}_${i}`,
      ...iss
    }));
  }

  /** Get random target from pool for enemy labeling */
  getTarget(type) {
    let pool;
    switch (type) {
      case 'email': pool = this.emailPool; break;
      case 'file': pool = this.filePool; break;
      case 'lint': pool = this.lintPool; break;
      default: pool = this.emailPool;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** Queue a chore for batch execution */
  queueChore(type, targetData, comboMultiplier = 1) {
    switch (type) {
      case 'email':
        this.pendingBatch.emails.push(targetData);
        break;
      case 'file':
        this.pendingBatch.files.push(targetData);
        break;
      case 'lint':
        this.pendingBatch.lints.push(targetData);
        break;
    }

    clearTimeout(this.batchTimer);
    this.batchTimer = setTimeout(() => this._executeBatch(comboMultiplier), this.batchDelay);
  }

  /** Execute all pending chores in a batch */
  _executeBatch(comboMultiplier) {
    const batch = { ...this.pendingBatch };
    this.pendingBatch = { emails: [], files: [], lints: [] };

    if (batch.emails.length > 0) {
      this._executeEmailBatch(batch.emails, comboMultiplier);
    }
    if (batch.files.length > 0) {
      this._executeFileBatch(batch.files, comboMultiplier);
    }
    if (batch.lints.length > 0) {
      this._executeLintBatch(batch.lints, comboMultiplier);
    }

    this.stats.batchesSent++;
  }

  /**
   * Execute email batch — DELETES SPAM or ARCHIVES based on settings
   */
  async _executeEmailBatch(emails, combo) {
    const count = emails.length;
    const action = this.config.emailAction || 'trash';
    const isDelete = action === 'trash' || action === 'permanent';
    const isLive = this.config.connectionMode === 'live' && !!this.config.email && !!this.config.password;

    if (isDelete) {
      this.stats.emailsDeleted += count;
    } else {
      this.stats.emailsArchived += count;
    }
    this.stats.totalChores += count;

    // Send API request to local server
    try {
      const endpoint = isDelete ? '/api/chore/delete-spam-batch' : '/api/chore/archive-batch';
      const response = await fetch(`${this.apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count,
          action,
          comboMultiplier: combo,
          dryRun: !isLive,
          email: this.config.email,
          password: this.config.password,
          targets: emails.map(e => ({ id: e.id, sender: e.sender, subject: e.subject }))
        })
      });
      const data = await response.json();
      console.log('%c[Orchestrator] Spam chore executed:', 'color: #ff2244', data);
    } catch (err) {
      console.log('%c[Orchestrator] Offline/Simulated execution:', 'color: #ffaa00', {
        action: isDelete ? `DELETE_${action.toUpperCase()}` : 'ARCHIVE',
        count,
        combo
      });
    }

    // Update chore feed in UI
    if (this.onChoreExecuted) {
      if (isDelete) {
        if (count === 1) {
          const senderName = emails[0].sender.split('@')[0];
          const actionWord = action === 'permanent' ? 'PURGED' : 'TRASHED';
          this.onChoreExecuted(
            'email',
            `🗑️ Spam ${actionWord}: ${senderName}`,
            emails[0].subject
          );
        } else {
          const actionWord = action === 'permanent' ? 'PERMANENTLY PURGED' : 'MOVED TO TRASH';
          this.onChoreExecuted(
            'combo',
            `🔥 SPAM MASSACRE: ${count} emails ${actionWord}`,
            `Combo x${combo} — Cleaned from Inbox`
          );
        }
      } else {
        if (count === 1) {
          this.onChoreExecuted(
            'email',
            `📦 Archived: ${emails[0].sender.split('@')[0]}`,
            emails[0].subject
          );
        } else {
          this.onChoreExecuted(
            'combo',
            `📦 BATCH ARCHIVE: ${count} emails`,
            `Combo x${combo} — Marked read & archived`
          );
        }
      }
    }
  }

  _executeFileBatch(files, combo) {
    const count = files.length;
    this.stats.filesCleaned += count;
    this.stats.totalChores += count;

    const totalSize = files.reduce((sum, f) => {
      const num = parseFloat(f.size);
      const unit = f.size.replace(/[0-9.]/g, '');
      if (unit === 'MB') return sum + num;
      if (unit === 'KB') return sum + num / 1024;
      return sum + num / (1024 * 1024);
    }, 0);

    if (this.onChoreExecuted) {
      if (count === 1) {
        this.onChoreExecuted(
          'file',
          `📁 Cleaned: ${files[0].name}`,
          `${files[0].size} freed from ${files[0].dir}`
        );
      } else {
        this.onChoreExecuted(
          'combo',
          `📁 BATCH CLEAN: ${count} files`,
          `${totalSize.toFixed(1)}MB recovered`
        );
      }
    }
  }

  _executeLintBatch(lints, combo) {
    const count = lints.length;
    this.stats.lintFixes += count;
    this.stats.totalChores += count;

    if (this.onChoreExecuted) {
      if (count === 1) {
        this.onChoreExecuted(
          'lint',
          `⚠️ Fixed: ${lints[0].rule}`,
          `${lints[0].fix} in ${lints[0].file}`
        );
      } else {
        this.onChoreExecuted(
          'combo',
          `⚠️ BATCH FIX: ${count} lint issues`,
          `Auto-fix applied across ${count} files`
        );
      }
    }
  }

  executeBossKill(bossData) {
    this.stats.filesCleaned++;
    this.stats.totalChores++;

    if (this.onChoreExecuted) {
      this.onChoreExecuted(
        'boss',
        `💀 BOSS PURGED: ${bossData.name || 'Large Attachment'}`,
        `${bossData.size || '>50MB'} permanently deleted!`
      );
    }
  }

  getStats() {
    return { ...this.stats };
  }

  reset() {
    this.stats = {
      emailsDeleted: 0,
      emailsArchived: 0,
      filesCleaned: 0,
      lintFixes: 0,
      totalChores: 0,
      batchesSent: 0
    };
    this.pendingBatch = { emails: [], files: [], lints: [] };
    clearTimeout(this.batchTimer);
  }
}

window.choreOrchestrator = new ChoreOrchestrator();
