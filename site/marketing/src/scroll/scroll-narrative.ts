import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { CapSceneController } from '../three/cap-scene';

gsap.registerPlugin(ScrollTrigger);

export function initScrollNarrative(capScene: CapSceneController | null): () => void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrativeScroll = document.querySelector<HTMLElement>('#narrative-scroll');

  if (!narrativeScroll) {
    return () => undefined;
  }

  const updateSceneProgress = (progress: number): void => {
    document.documentElement.style.setProperty('--scene-progress', String(progress));
  };

  let lenis: Lenis | null = null;
  let scrollTrigger: ScrollTrigger | null = null;

  const onScrollUpdate = (progress: number): void => {
    capScene?.setScrollProgress(progress);
    updateSceneProgress(progress);
  };

  if (reducedMotion.matches) {
    const sections = narrativeScroll.querySelectorAll<HTMLElement>('.frame');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const index = [...sections].indexOf(entry.target as HTMLElement);
          const progress = index / Math.max(sections.length - 1, 1);
          onScrollUpdate(progress);
        });
      },
      { threshold: 0.45 },
    );

    sections.forEach((section) => observer.observe(section));
    onScrollUpdate(0);

    return () => observer.disconnect();
  }

  lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    syncTouch: false,
  });

  lenis.on('scroll', ScrollTrigger.update);

  const ticker = (time: number): void => {
    lenis?.raf(time * 1000);
  };
  gsap.ticker.add(ticker);
  gsap.ticker.lagSmoothing(0);

  scrollTrigger = ScrollTrigger.create({
    trigger: narrativeScroll,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.85,
    onUpdate: (self) => onScrollUpdate(self.progress),
  });

  onScrollUpdate(0);

  return () => {
    scrollTrigger?.kill();
    gsap.ticker.remove(ticker);
    lenis?.destroy();
  };
}
