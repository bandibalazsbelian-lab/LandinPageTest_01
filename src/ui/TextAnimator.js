import gsap from 'gsap';

export class TextAnimator {
  // Hero subtitle fade-in with glow
  static animateSubtitle(element, delay = 0) {
    gsap.fromTo(element, {
      opacity: 0, y: 15
    }, {
      opacity: 0.8, y: 0,
      duration: 0.8, ease: 'power2.out', delay
    });
  }

  // Scroll indicator appear + breathing
  static animateScrollIndicator(element, delay = 0) {
    gsap.fromTo(element, { opacity: 0 }, {
      opacity: 1, duration: 1, delay, ease: 'power2.out'
    });
  }

  // Mission headline — char-by-char (Orbitron style)
  static animateHeadline(element, delay = 0) {
    const text = element.textContent;
    element.textContent = '';

    const chars = text.split('');
    chars.forEach((char) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.cssText = `
        display: inline-block;
        opacity: 0;
        transform: translateY(20px);
      `;
      element.appendChild(span);
    });

    gsap.to(element.children, {
      opacity: 1, y: 0,
      duration: 0.5, stagger: 0.04,
      ease: 'expo.out', delay
    });
  }

  // Body text — staggered line fade
  static animateBody(element, delay = 0) {
    gsap.fromTo(element, {
      opacity: 0, y: 20
    }, {
      opacity: 0.85, y: 0,
      duration: 0.8, ease: 'power2.out', delay
    });
  }

  // Stat counter with slot-machine digit roll
  static animateCounter(element, targetValue, duration = 2.5, suffix = '') {
    const obj = { value: 0 };
    gsap.to(obj, {
      value: targetValue,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        element.textContent = Math.round(obj.value) + suffix;
      }
    });
  }
}
