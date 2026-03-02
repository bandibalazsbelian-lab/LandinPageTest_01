import gsap from 'gsap';

export class TransitionFX {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.isTransitioning = false;
  }

  sectionTransition(direction = 1) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    const sm = this.sceneManager;

    sm.chromaticBurst(0.012, 300);

    const tl = gsap.timeline({
      onComplete: () => { this.isTransitioning = false; }
    });

    // Film grain burst
    if (sm.noiseEffect && sm.noiseEffect.blendMode && sm.noiseEffect.blendMode.opacity) {
      gsap.to(sm.noiseEffect.blendMode.opacity, {
        value: 0.25, duration: 0.1, ease: 'power2.in',
        onComplete: () => {
          gsap.to(sm.noiseEffect.blendMode.opacity, {
            value: 0.08, duration: 0.4, ease: 'power2.out'
          });
        }
      });
    }

    // Bloom flash
    if (sm.bloomEffect) {
      gsap.to(sm.bloomEffect, {
        intensity: 3.0, duration: 0.1, ease: 'power3.in',
        onComplete: () => {
          gsap.to(sm.bloomEffect, {
            intensity: 2.0, duration: 0.5, ease: 'expo.out'
          });
        }
      });
    }
  }

  // Preloader exit — white flash + chromatic spike
  glitchBurst(duration = 400) {
    return new Promise(resolve => {
      const sm = this.sceneManager;
      sm.chromaticBurst(0.04, duration);

      if (sm.bloomEffect) {
        gsap.to(sm.bloomEffect, {
          intensity: 3.5,
          duration: duration * 0.001 * 0.3,
          ease: 'power4.in',
          onComplete: () => {
            gsap.to(sm.bloomEffect, {
              intensity: 2.0,
              duration: duration * 0.001 * 0.7,
              ease: 'expo.out'
            });
          }
        });
      }

      if (sm.vignetteEffect) {
        gsap.to(sm.vignetteEffect, {
          darkness: 0.9,
          duration: duration * 0.001 * 0.2,
          ease: 'power4.in',
          onComplete: () => {
            gsap.to(sm.vignetteEffect, {
              darkness: 0.55,
              duration: duration * 0.001 * 0.8,
              ease: 'power2.out'
            });
          }
        });
      }

      setTimeout(resolve, duration);
    });
  }

  dispose() {}
}
