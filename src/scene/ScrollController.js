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

    // Setup section triggers with camera choreography
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

      // Parallax depth effect on each section's content
      this._setupSectionParallax(section, index);
    });

    // Pillar card stagger reveal
    this._setupPillarStagger();

    // Stat hex stagger reveal
    this._setupStatStagger();

    // Social link stagger reveal
    this._setupSocialStagger();

    // Smooth scroll implementation
    this.scrollContainer.addEventListener('scroll', () => {
      this.targetScroll = this.scrollContainer.scrollTop;
    });
  }

  _setupSectionParallax(section, index) {
    // Each section's content slides up with parallax offset
    const content = section.querySelector('.section-content, .hero-content, .mission-content, .pillar-grid, .stats-grid, .social-grid, .footer-content');
    if (!content) return;

    // Sections enter from below with scale and opacity
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

    // Sections fade out and scale down as they leave
    if (index < 5) { // Don't fade out footer
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

  _setupPillarStagger() {
    const cards = document.querySelectorAll('.pillar-card');
    if (!cards.length) return;

    cards.forEach((card, i) => {
      gsap.fromTo(card,
        { y: 80, opacity: 0, scale: 0.88, rotateY: 8 },
        {
          y: 0, opacity: 1, scale: 1, rotateY: 0,
          duration: 0.9,
          delay: i * 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card.parentElement,
            scroller: this.scrollContainer,
            start: 'top 75%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });
  }

  _setupStatStagger() {
    const hexes = document.querySelectorAll('.stat-hex');
    if (!hexes.length) return;

    hexes.forEach((hex, i) => {
      gsap.fromTo(hex,
        { y: 50, opacity: 0, scale: 0.7, rotate: -10 },
        {
          y: 0, opacity: 1, scale: 1, rotate: 0,
          duration: 0.8,
          delay: i * 0.15,
          ease: 'back.out(1.4)',
          scrollTrigger: {
            trigger: hex.parentElement,
            scroller: this.scrollContainer,
            start: 'top 75%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });
  }

  _setupSocialStagger() {
    const links = document.querySelectorAll('.social-link');
    if (!links.length) return;

    links.forEach((link, i) => {
      gsap.fromTo(link,
        { y: 40, opacity: 0, scale: 0.85 },
        {
          y: 0, opacity: 1, scale: 1,
          duration: 0.7,
          delay: i * 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: link.parentElement,
            scroller: this.scrollContainer,
            start: 'top 80%',
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
