import gsap from 'gsap';

export class TransitionFX {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.isTransitioning = false;
  }

  // Full chromatic aberration + shake transition
  sectionTransition(direction = 1) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const sm = this.sceneManager;

    // Chromatic aberration burst
    sm.chromaticBurst(0.015, 600);

    // Camera shake
    const originalPos = sm.cameraTarget.clone();
    const shakeTimeline = gsap.timeline({
      onComplete: () => {
        this.isTransitioning = false;
      }
    });

    shakeTimeline.to(sm.camera.position, {
      x: originalPos.x + (Math.random() - 0.5) * 0.3,
      y: originalPos.y + (Math.random() - 0.5) * 0.3,
      duration: 0.05,
      ease: 'none'
    });
    shakeTimeline.to(sm.camera.position, {
      x: originalPos.x - (Math.random() - 0.5) * 0.2,
      y: originalPos.y - (Math.random() - 0.5) * 0.2,
      duration: 0.05,
      ease: 'none'
    });
    shakeTimeline.to(sm.camera.position, {
      x: originalPos.x,
      y: originalPos.y,
      duration: 0.2,
      ease: 'power2.out'
    });

    // Film grain burst
    if (sm.noiseEffect) {
      gsap.to(sm.noiseEffect.blendMode.opacity, {
        value: 0.35,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => {
          gsap.to(sm.noiseEffect.blendMode.opacity, {
            value: 0.12,
            duration: 0.5,
            ease: 'power2.out'
          });
        }
      });
    }

    // Bloom burst
    if (sm.bloomEffect) {
      const origIntensity = sm.bloomEffect.intensity;
      gsap.to(sm.bloomEffect, {
        intensity: origIntensity * 2,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => {
          gsap.to(sm.bloomEffect, {
            intensity: origIntensity,
            duration: 0.5,
            ease: 'power2.out'
          });
        }
      });
    }
  }

  // Glitch effect for preloader exit
  glitchBurst(duration = 400) {
    return new Promise(resolve => {
      const sm = this.sceneManager;

      // Intense chromatic aberration
      sm.chromaticBurst(0.04, duration);

      // Rapid bloom flash
      if (sm.bloomEffect) {
        gsap.to(sm.bloomEffect, {
          intensity: 2.0,
          duration: duration * 0.001 * 0.3,
          ease: 'power4.in',
          onComplete: () => {
            gsap.to(sm.bloomEffect, {
              intensity: 0.6,
              duration: duration * 0.001 * 0.7,
              ease: 'expo.out'
            });
          }
        });
      }

      setTimeout(resolve, duration);
    });
  }

  dispose() {}
}
