import gsap from 'gsap';

export class TransitionFX {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.isTransitioning = false;
  }

  // Full chromatic aberration + shake + bloom + vignette transition
  sectionTransition(direction = 1) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const sm = this.sceneManager;

    // Chromatic aberration burst
    sm.chromaticBurst(0.02, 700);

    // Camera shake — rapid multi-axis
    const originalPos = sm.cameraTarget.clone();
    const tl = gsap.timeline({
      onComplete: () => { this.isTransitioning = false; }
    });

    // 4-hit shake pattern
    for (let i = 0; i < 4; i++) {
      const intensity = (4 - i) / 4 * 0.25;
      tl.to(sm.camera.position, {
        x: originalPos.x + (Math.random() - 0.5) * intensity,
        y: originalPos.y + (Math.random() - 0.5) * intensity,
        z: sm.camera.position.z + (Math.random() - 0.5) * intensity * 0.5,
        duration: 0.04,
        ease: 'none'
      });
    }
    tl.to(sm.camera.position, {
      x: originalPos.x,
      y: originalPos.y,
      duration: 0.25,
      ease: 'power2.out'
    });

    // Film grain burst
    if (sm.noiseEffect && sm.noiseEffect.blendMode && sm.noiseEffect.blendMode.opacity) {
      gsap.to(sm.noiseEffect.blendMode.opacity, {
        value: 0.4,
        duration: 0.12,
        ease: 'power2.in',
        onComplete: () => {
          gsap.to(sm.noiseEffect.blendMode.opacity, {
            value: 0.12,
            duration: 0.6,
            ease: 'power2.out'
          });
        }
      });
    }

    // Bloom burst — intense flash
    if (sm.bloomEffect) {
      const origIntensity = 1.0;
      gsap.to(sm.bloomEffect, {
        intensity: origIntensity * 2.5,
        duration: 0.12,
        ease: 'power3.in',
        onComplete: () => {
          gsap.to(sm.bloomEffect, {
            intensity: origIntensity,
            duration: 0.6,
            ease: 'expo.out'
          });
        }
      });
    }

    // Vignette punch — darken edges momentarily
    if (sm.vignetteEffect) {
      gsap.to(sm.vignetteEffect, {
        darkness: 0.9,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => {
          gsap.to(sm.vignetteEffect, {
            darkness: 0.6,
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
          intensity: 2.5,
          duration: duration * 0.001 * 0.3,
          ease: 'power4.in',
          onComplete: () => {
            gsap.to(sm.bloomEffect, {
              intensity: 1.0,
              duration: duration * 0.001 * 0.7,
              ease: 'expo.out'
            });
          }
        });
      }

      // Vignette slam
      if (sm.vignetteEffect) {
        gsap.to(sm.vignetteEffect, {
          darkness: 1.0,
          duration: duration * 0.001 * 0.2,
          ease: 'power4.in',
          onComplete: () => {
            gsap.to(sm.vignetteEffect, {
              darkness: 0.6,
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
