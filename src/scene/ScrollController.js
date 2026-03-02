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

    this.targetScroll = 0;
    this.currentScroll = 0;
    this.scrollVelocity = 0;

    this._init();
  }

  _init() {
    ScrollTrigger.defaults({
      scroller: this.scrollContainer
    });

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

      this._setupSectionParallax(section, index);
    });

    this._setupStatStagger();

    this.scrollContainer.addEventListener('scroll', () => {
      this.targetScroll = this.scrollContainer.scrollTop;
    });
  }

  _setupSectionParallax(section, index) {
    const content = section.querySelector('.hero-content, .mission-content, .hud-frame, .footer-content');
    if (!content) return;

    gsap.fromTo(content,
      { y: 60, opacity: 0, scale: 0.96 },
      {
        y: 0, opacity: 1, scale: 1,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          scroller: this.scrollContainer,
          start: 'top 85%',
          end: 'top 30%',
          scrub: 0.8,
        }
      }
    );

    if (index < 5) {
      gsap.fromTo(content,
        { opacity: 1, scale: 1 },
        {
          opacity: 0.3, scale: 0.94,
          scrollTrigger: {
            trigger: section,
            scroller: this.scrollContainer,
            start: 'bottom 60%',
            end: 'bottom 10%',
            scrub: 0.6,
          }
        }
      );
    }
  }

  _setupStatStagger() {
    const modules = document.querySelectorAll('.stat-module');
    if (!modules.length) return;

    modules.forEach((mod, i) => {
      gsap.fromTo(mod,
        { y: 50, opacity: 0, scale: 0.7 },
        {
          y: 0, opacity: 1, scale: 1,
          duration: 0.8,
          delay: i * 0.15,
          ease: 'back.out(1.4)',
          scrollTrigger: {
            trigger: mod.parentElement,
            scroller: this.scrollContainer,
            start: 'top 75%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });
  }

  _onSectionEnter(index) {
    if (index !== this.currentSection) {
      const prevSection = this.currentSection;
      this.currentSection = index;

      if (this.sceneManager) {
        this.sceneManager.chromaticBurst(0.008, 300);
        this.sceneManager.setCurrentSection(index);
      }
      if (this.soundEngine) {
        this.soundEngine.play('transition_whoosh');
      }

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
    this.currentScroll += (this.targetScroll - this.currentScroll) * 0.1;
    this.scrollVelocity = Math.abs(this.targetScroll - this.currentScroll);
  }

  scrollToTop() {
    this.scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  }

  refresh() { ScrollTrigger.refresh(); }
  dispose() { ScrollTrigger.getAll().forEach(t => t.kill()); }
}
