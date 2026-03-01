import gsap from 'gsap';

export class TextAnimator {
  // Animate hero title — letters fade in with stagger
  static animateHeroTitle(element, delay = 0) {
    const text = element.textContent;
    element.textContent = '';
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';

    const chars = text.split('');
    chars.forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.cssText = `
        display: inline-block;
        opacity: 0;
        transform: translateY(30px) scale(0.8);
        filter: blur(4px);
      `;
      element.appendChild(span);
    });

    gsap.to(element.children, {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      duration: 0.6,
      stagger: 0.04,
      ease: 'expo.out',
      delay: delay
    });
  }

  // Fade in subtitle
  static animateSubtitle(element, delay = 0) {
    gsap.fromTo(element, {
      opacity: 0,
      y: 15
    }, {
      opacity: 0.6,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
      delay: delay
    });
  }

  // Sequential word reveal
  static animateHeadline(element, delay = 0) {
    const text = element.textContent;
    element.textContent = '';

    const words = text.split(' ');
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.textContent = word;
      span.style.cssText = `
        display: inline-block;
        opacity: 0;
        transform: translateY(20px);
        margin-right: 0.3em;
      `;
      element.appendChild(span);
    });

    gsap.to(element.children, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.15,
      ease: 'power2.out',
      delay: delay
    });
  }

  // Fade in paragraph
  static animateBody(element, delay = 0) {
    gsap.fromTo(element, {
      opacity: 0,
      y: 20
    }, {
      opacity: 0.85,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
      delay: delay
    });
  }

  // Scroll indicator pulse
  static animateScrollIndicator(element, delay = 0) {
    gsap.fromTo(element, {
      opacity: 0
    }, {
      opacity: 1,
      duration: 1,
      delay: delay,
      ease: 'power2.out'
    });
  }

  // Counter animation for stats
  static animateCounter(element, targetValue, duration = 2, suffix = '') {
    const obj = { value: 0 };
    gsap.to(obj, {
      value: targetValue,
      duration: duration,
      ease: 'power2.out',
      onUpdate: () => {
        element.textContent = Math.round(obj.value) + suffix;
      }
    });
  }
}
