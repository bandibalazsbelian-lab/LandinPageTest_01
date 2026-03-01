import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class ScrollController {
  constructor(sceneManager, soundEngine) {
    this.sceneManager = sceneManager;
    this.soundEngine = soundEngine;
    this.currentSection = 0;
    this.scrollProgress = 0;
    this.sectionCallbacks = {};
    this.scrollContainer = document.getElementById('scroll-container');

    // Smooth scroll state
    this.targetScroll = 0;
    this.currentScroll = 0;
    this.scrollVelocity = 0;

    this._init();
  }

  _init() {
    // Configure ScrollTrigger to use our scroll container
    ScrollTrigger.defaults({
      scroller: this.scrollContainer
    });

    // Setup section triggers
    const sections = document.querySelectorAll('.section');
    sections.forEach((section, index) => {
      ScrollTrigger.create({
        trigger: section,
        scroller: this.scrollContainer,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => this._onSectionEnter(index),
        onEnterBack: () => this._onSectionEnter(index),
        onUpdate: (self) => {
          this.scrollProgress = self.progress;
          if (this.sceneManager) {
            this.sceneManager.setCameraForSection(index, self.progress);
          }
        }
      });
    });

    // Smooth scroll implementation
    this.scrollContainer.addEventListener('scroll', () => {
      this.targetScroll = this.scrollContainer.scrollTop;
    });
  }

  _onSectionEnter(index) {
    if (index !== this.currentSection) {
      const prevSection = this.currentSection;
      this.currentSection = index;

      // Trigger transition effects
      if (this.sceneManager) {
        this.sceneManager.chromaticBurst(0.012, 500);
      }
      if (this.soundEngine) {
        this.soundEngine.play('transition_whoosh');
      }

      // Fire registered callbacks
      if (this.sectionCallbacks[index]) {
        this.sectionCallbacks[index].forEach(cb => cb(index, prevSection));
      }
    }
  }

  onSectionEnter(sectionIndex, callback) {
    if (!this.sectionCallbacks[sectionIndex]) {
      this.sectionCallbacks[sectionIndex] = [];
    }
    this.sectionCallbacks[sectionIndex].push(callback);
  }

  update(delta) {
    // Lerp-based smooth scrolling
    this.currentScroll += (this.targetScroll - this.currentScroll) * 0.1;
    this.scrollVelocity = Math.abs(this.targetScroll - this.currentScroll);
  }

  // Animate elements when they scroll into view
  animateOnScroll(element, animation) {
    ScrollTrigger.create({
      trigger: element,
      scroller: this.scrollContainer,
      start: 'top 80%',
      once: true,
      onEnter: () => animation()
    });
  }

  refresh() {
    ScrollTrigger.refresh();
  }

  dispose() {
    ScrollTrigger.getAll().forEach(t => t.kill());
  }
}
