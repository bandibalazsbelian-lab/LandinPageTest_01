export class Gamification {
  constructor(soundEngine) {
    this.soundEngine = soundEngine;
    this.explorerFill = document.getElementById('explorer-fill');
    this.explorerProgress = document.getElementById('explorer-progress');
    this.explorerBadge = document.getElementById('explorer-badge');
    this.toastContainer = document.getElementById('toast-container');

    // Tracking
    this.state = {
      sectionsVisited: new Set(),
      pillarsExplored: new Set(),
      socialHovered: new Set(),
      totalInteractions: 0
    };

    // Load from session
    this._loadState();
  }

  _loadState() {
    try {
      const saved = sessionStorage.getItem('innovationhub_progress');
      if (saved) {
        const data = JSON.parse(saved);
        this.state.sectionsVisited = new Set(data.sectionsVisited || []);
        this.state.pillarsExplored = new Set(data.pillarsExplored || []);
        this.state.socialHovered = new Set(data.socialHovered || []);
        this.state.totalInteractions = data.totalInteractions || 0;
      }
    } catch (e) {}
    this._updateProgress();
  }

  _saveState() {
    try {
      sessionStorage.setItem('innovationhub_progress', JSON.stringify({
        sectionsVisited: [...this.state.sectionsVisited],
        pillarsExplored: [...this.state.pillarsExplored],
        socialHovered: [...this.state.socialHovered],
        totalInteractions: this.state.totalInteractions
      }));
    } catch (e) {}
  }

  visitSection(index) {
    if (!this.state.sectionsVisited.has(index)) {
      this.state.sectionsVisited.add(index);
      this.state.totalInteractions++;
      this._updateProgress();
      this._saveState();
    }
  }

  explorePillar(name) {
    if (!this.state.pillarsExplored.has(name)) {
      this.state.pillarsExplored.add(name);
      this.state.totalInteractions++;

      // Show badge on pillar card
      const badge = document.getElementById(`badge-${name}`);
      if (badge) badge.classList.add('discovered');

      // Toast
      const displayNames = {
        colab: 'CoLabMűhely',
        challenge: 'InnoChallenge',
        lab: 'InnoLab',
        future: 'FutureWatch'
      };
      this.showToast(`${displayNames[name] || name} Felfedezve!`);

      if (this.soundEngine) {
        this.soundEngine.play('achievement_ding');
      }

      this._updateProgress();
      this._saveState();
    }
  }

  hoverSocial(platform) {
    if (!this.state.socialHovered.has(platform)) {
      this.state.socialHovered.add(platform);
      this.state.totalInteractions++;
      this._updateProgress();
      this._saveState();
    }
  }

  _updateProgress() {
    // Calculate total progress
    // 6 sections + 4 pillars + 3 social = 13 total checkpoints
    const total = 6 + 4 + 3;
    const achieved = this.state.sectionsVisited.size +
                     this.state.pillarsExplored.size +
                     this.state.socialHovered.size;

    const pct = Math.min((achieved / total) * 100, 100);

    if (this.explorerFill) {
      this.explorerFill.style.width = pct + '%';
    }

    // Show badge at 100%
    if (pct >= 100 && this.explorerBadge) {
      this.explorerBadge.style.display = 'block';
      if (this.soundEngine) {
        this.soundEngine.play('achievement_ding');
      }
    }
  }

  showToast(message) {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2200);
  }

  show() {
    if (this.explorerProgress) {
      this.explorerProgress.style.opacity = '1';
    }
  }

  dispose() {}
}
