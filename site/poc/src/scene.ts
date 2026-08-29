import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  DirectionalLight,
  Euler,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
  type WebGLRenderTarget,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface SampleStatistics {
  sampleCount: number;
  minimumMs: number | null;
  medianMs: number | null;
  p95Ms: number | null;
  maximumMs: number | null;
  meanMs: number | null;
}

export interface SceneMetricsSnapshot {
  label: string;
  recordingDurationMs: number;
  gpuRenderer: string;
  renderCpuDuration: SampleStatistics;
  activeRenderInterval: SampleStatistics;
  percentileCalculation: string;
}

interface SceneMetricsController {
  start: () => void;
  stop: () => SceneMetricsSnapshot;
  snapshot: () => SceneMetricsSnapshot;
}

interface SceneStateSnapshot {
  initialisedAt: number;
  modelReadyAt: number | null;
  arrivalStartedAt: number | null;
  arrivalSettledAt: number | null;
  totalRenderCount: number;
  lastRenderAt: number | null;
  renderScheduled: boolean;
  environmentReady: boolean;
  contactShadowEnabled: boolean;
  materialProfiles: {
    fabric: number;
    gold: number;
    texturedComposite: number;
  };
}

declare global {
  interface Window {
    __scholarSceneMetrics?: SceneMetricsController;
    __scholarSceneState?: { snapshot: () => SceneStateSnapshot };
  }
}

export async function initialiseHeroScene(
  sceneCanvas: HTMLCanvasElement,
  sceneContainer: HTMLElement,
): Promise<void> {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');

  if (!supportsWebGL()) {
    showFallback();
    return;
  }

  let renderer: WebGLRenderer;

  try {
    renderer = new WebGLRenderer({
      canvas: sceneCanvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    console.warn('A experiência 3D não pôde ser iniciada.', error);
    showFallback();
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = false;

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.08, 6.7);

  const environmentTarget = createStudioEnvironment(renderer);
  const environmentMap = environmentTarget.texture;
  scene.environment = environmentMap;

  const ambientLight = new HemisphereLight(0x4d6580, 0x01040b, 0.16);
  const goldKeyLight = new DirectionalLight(0xffd791, 4.6);
  goldKeyLight.position.set(4.2, 5.2, 4.5);

  const coolFillLight = new DirectionalLight(0x5277aa, 1.15);
  coolFillLight.position.set(-5.2, 2.4, 4.6);
  const goldRimLight = new PointLight(0xffbf58, 58, 12, 1.65);
  goldRimLight.position.set(3.6, 2.4, -2.8);
  scene.add(ambientLight, goldKeyLight, coolFillLight, goldRimLight);

  const metrics = createSceneMetrics(readGpuRenderer(renderer));
  window.__scholarSceneMetrics = metrics.controller;
  const sceneState: SceneStateSnapshot = {
    initialisedAt: performance.now(),
    modelReadyAt: null,
    arrivalStartedAt: null,
    arrivalSettledAt: null,
    totalRenderCount: 0,
    lastRenderAt: null,
    renderScheduled: false,
    environmentReady: Boolean(scene.environment),
    contactShadowEnabled: false,
    materialProfiles: {
      fabric: 0,
      gold: 0,
      texturedComposite: 0,
    },
  };
  window.__scholarSceneState = { snapshot: () => ({ ...sceneState }) };

  let model: Group | null = null;
  let animationFrame: number | null = null;
  let disposed = false;
  let contextAvailable = true;
  let arrivalStartedAt = 0;
  let baseScale = 1;
  const pointerTarget = new Vector2();
  const pointerCurrent = new Vector2();
  const baseRotation = new Euler(-0.16, -0.34, 0.045);

  const render = (time: number): void => {
    animationFrame = null;
    sceneState.renderScheduled = false;

    if (
      disposed ||
      !model ||
      !contextAvailable ||
      document.visibilityState !== 'visible'
    ) {
      metrics.markInactive();
      return;
    }

    const reduce = reducedMotion.matches;
    const arrivalProgress = reduce ? 1 : Math.min((time - arrivalStartedAt) / 1350, 1);
    const arrivalEase = 1 - Math.pow(1 - arrivalProgress, 3);

    pointerCurrent.lerp(pointerTarget, reduce ? 1 : 0.075);

    const responsiveScale = window.innerWidth <= 768 ? 0.9 : 1;
    const settledScale = baseScale * responsiveScale;
    model.scale.setScalar(settledScale * (reduce ? 1 : 0.93 + 0.07 * arrivalEase));
    model.rotation.set(
      baseRotation.x + pointerCurrent.y * 0.025,
      baseRotation.y - (1 - arrivalEase) * 0.16 + pointerCurrent.x * 0.04,
      baseRotation.z,
    );

    camera.position.x = pointerCurrent.x * 0.11;
    camera.position.y = 0.12 + pointerCurrent.y * 0.07;
    camera.lookAt(0, 0, 0);
    goldRimLight.position.x = 3.6 + pointerCurrent.x * 0.38;
    goldRimLight.position.y = 2.4 + pointerCurrent.y * 0.22;

    const pointerDelta = pointerCurrent.distanceTo(pointerTarget);
    const keepRendering = !reduce && (arrivalProgress < 1 || pointerDelta > 0.001);
    if (keepRendering) {
      scheduleRender();
    }

    const renderStartedAt = performance.now();
    renderer.render(scene, camera);
    metrics.record(time, renderStartedAt, performance.now());
    sceneState.totalRenderCount += 1;
    sceneState.lastRenderAt = performance.now();

    if (!keepRendering) {
      if (arrivalProgress >= 1 && sceneState.arrivalSettledAt === null) {
        sceneState.arrivalSettledAt = performance.now();
      }
      metrics.markInactive();
    }
  };

  const scheduleRender = (): void => {
    if (
      animationFrame === null &&
      !disposed &&
      document.visibilityState === 'visible'
    ) {
      animationFrame = window.requestAnimationFrame(render);
      sceneState.renderScheduled = true;
    }
  };

  const resize = (): void => {
    const width = Math.max(1, sceneContainer.clientWidth);
    const height = Math.max(1, sceneContainer.clientHeight);
    const renderScale = 0.64;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
    renderer.setSize(
      Math.max(1, Math.round(width * renderScale)),
      Math.max(1, Math.round(height * renderScale)),
      false,
    );
    camera.aspect = width / height;
    camera.fov = window.innerWidth <= 768 ? 35 : 32;
    camera.updateProjectionMatrix();

    if (model) {
      model.position.set(window.innerWidth <= 768 ? 0.2 : 0.42, -0.18, 0);
    }

    scheduleRender();
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (reducedMotion.matches) {
      return;
    }

    pointerTarget.set(
      MathUtils.clamp((event.clientX / window.innerWidth - 0.5) * 2, -1, 1),
      MathUtils.clamp(-(event.clientY / window.innerHeight - 0.5) * 2, -1, 1),
    );
    sceneState.arrivalSettledAt = null;
    scheduleRender();
  };

  const updateMotionPreference = (): void => {
    pointerTarget.set(0, 0);
    pointerCurrent.set(0, 0);

    if (finePointer.matches && !reducedMotion.matches) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
    } else {
      window.removeEventListener('pointermove', onPointerMove);
    }

    scheduleRender();
  };

  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden' && animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
      sceneState.renderScheduled = false;
      metrics.markInactive();
    } else {
      scheduleRender();
    }
  };

  const onContextLost = (event: Event): void => {
    event.preventDefault();
    contextAvailable = false;
    document.documentElement.classList.remove('scene-ready');
    showFallback();
    metrics.markInactive();

    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
      sceneState.renderScheduled = false;
    }
  };

  const onContextRestored = (): void => {
    contextAvailable = true;
    if (model) {
      document.documentElement.classList.remove('scene-fallback');
      document.documentElement.classList.remove('scene-static');
      document.documentElement.classList.add('scene-ready');
      scheduleRender();
    }
  };

  const dispose = (): void => {
    disposed = true;
    metrics.markInactive();

    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      sceneState.renderScheduled = false;
    }

    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('beforeunload', dispose);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    reducedMotion.removeEventListener('change', updateMotionPreference);
    finePointer.removeEventListener('change', updateMotionPreference);
    sceneCanvas.removeEventListener('webglcontextlost', onContextLost);
    sceneCanvas.removeEventListener('webglcontextrestored', onContextRestored);

    scene.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return;
      }

      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(disposeMaterial);
    });

    renderer.dispose();
    environmentTarget.dispose();
  };

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('beforeunload', dispose, { once: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  reducedMotion.addEventListener('change', updateMotionPreference);
  finePointer.addEventListener('change', updateMotionPreference);
  sceneCanvas.addEventListener('webglcontextlost', onContextLost);
  sceneCanvas.addEventListener('webglcontextrestored', onContextRestored);
  updateMotionPreference();
  resize();

  try {
    const loader = new GLTFLoader();
    const assetUrl = new URL(
      './assets/scholar-premium-graduation-cap.glb',
      document.baseURI,
    ).href;
    const gltf = await loader.loadAsync(assetUrl);

    if (disposed) {
      return;
    }

    const loadedModel = gltf.scene;
    sceneState.materialProfiles = prepareModel(loadedModel);

    const bounds = new Box3().setFromObject(loadedModel);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    loadedModel.position.sub(center);

    model = new Group();
    model.add(loadedModel);
    baseScale = 3.15 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(baseScale);
    model.rotation.copy(baseRotation);
    scene.add(model);

    arrivalStartedAt = performance.now();
    sceneState.modelReadyAt = arrivalStartedAt;
    sceneState.arrivalStartedAt = arrivalStartedAt;
    resize();
    document.documentElement.classList.remove('scene-fallback');
    document.documentElement.classList.remove('scene-static');
    document.documentElement.classList.add('scene-ready');
    scheduleRender();
  } catch (error) {
    console.warn('O objeto 3D não pôde ser carregado; exibindo a composição estática.', error);
    showFallback();
  }
}

function prepareModel(root: Object3D): SceneStateSnapshot['materialProfiles'] {
  const profiles = {
    fabric: 0,
    gold: 0,
    texturedComposite: 0,
  };

  root.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    object.castShadow = true;
    object.receiveShadow = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material];

    materials.forEach((material) => {
      if (material instanceof MeshStandardMaterial) {
        const identity = `${object.name} ${material.name}`.toLowerCase();
        const namedGold = /(tassel|cord|button|gold|metal|pendant)/i.test(identity);
        const baseColorGold = isWarmGold(material.color);

        if (namedGold || baseColorGold) {
          profiles.gold += 1;
          material.color.set(0xd9a94f);
          material.metalness = 0.92;
          material.roughness = 0.28;
          material.envMapIntensity = 0.86;
        } else if (material.map) {
          profiles.texturedComposite += 1;
          material.color.set(0xffffff);
          material.metalness = 0;
          material.roughness = 0.86;
          material.envMapIntensity = 0.22;
          applyTextureSurfaceProfile(material);
        } else {
          profiles.fabric += 1;
          material.color.set(0x071326);
          material.metalness = 0;
          material.roughness = 0.86;
          material.envMapIntensity = 0.18;
        }

        material.needsUpdate = true;
      }
    });
  });

  return profiles;
}

function isWarmGold(color: Color): boolean {
  return color.r > 0.42 && color.g > 0.25 && color.r > color.b * 1.45;
}

function applyTextureSurfaceProfile(material: MeshStandardMaterial): void {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
float scholarGoldMask(vec3 color) {
  float warm = smoothstep(0.035, 0.18, color.r - color.b);
  float yellow = smoothstep(0.015, 0.12, color.g - color.b);
  float brightness = smoothstep(0.12, 0.42, max(color.r, color.g));
  return warm * yellow * brightness;
}`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
float scholarSurfaceGold = scholarGoldMask(diffuseColor.rgb);
diffuseColor.rgb = mix(
  diffuseColor.rgb * vec3(0.78, 0.84, 0.96),
  diffuseColor.rgb * vec3(1.06, 0.96, 0.74),
  scholarSurfaceGold
);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor = mix(0.86, 0.28, scholarGoldMask(diffuseColor.rgb));`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
metalnessFactor = mix(0.0, 0.9, scholarGoldMask(diffuseColor.rgb));`,
      );
  };
  material.customProgramCacheKey = () => 'scholar-premium-cap-surface-v3';
}

function createStudioEnvironment(renderer: WebGLRenderer): WebGLRenderTarget {
  const pmremGenerator = new PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const envScene = new Scene();
  envScene.background = new Color(0x02050c);

  const sphereGeometry = new SphereGeometry(1, 24, 16);
  const lights = [
    { color: 0xffd791, radius: 5.2, position: [9, 11, 7.5] as const },
    { color: 0x3a587c, radius: 7, position: [-11, 4, 6] as const },
    { color: 0xffbf58, radius: 2.4, position: [6.5, 3.2, -9] as const },
  ];
  const lightMeshes = lights.map((light) => {
    const mesh = new Mesh(sphereGeometry, new MeshBasicMaterial({ color: light.color }));
    mesh.position.set(light.position[0], light.position[1], light.position[2]);
    mesh.scale.setScalar(light.radius);
    envScene.add(mesh);
    return mesh;
  });

  const environmentTarget = pmremGenerator.fromScene(envScene, 0.04);

  lightMeshes.forEach((mesh) => {
    if (mesh.material instanceof MeshBasicMaterial) {
      mesh.material.dispose();
    }
  });
  sphereGeometry.dispose();
  pmremGenerator.dispose();

  return environmentTarget;
}

function disposeMaterial(material: Material): void {
  Object.values(material).forEach((value: unknown) => {
    if (value instanceof Texture) {
      value.dispose();
    }
  });
  material.dispose();
}

function supportsWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (probe.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
          probe.getContext('webgl', { failIfMajorPerformanceCaveat: true })),
    );
  } catch {
    return false;
  }
}

function showFallback(): void {
  document.documentElement.classList.add('scene-fallback');
  document.documentElement.classList.remove('scene-static');
  document.documentElement.classList.remove('scene-ready');
}

function readGpuRenderer(renderer: WebGLRenderer): string {
  const context = renderer.getContext();
  const debug = context.getExtension('WEBGL_debug_renderer_info');
  return debug
    ? String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL))
    : 'WebGL renderer unavailable';
}

function createSceneMetrics(gpuRenderer: string): {
  controller: SceneMetricsController;
  record: (frameTimestamp: number, startedAt: number, endedAt: number) => void;
  markInactive: () => void;
} {
  let recording = false;
  let recordingStartedAt = 0;
  let recordingStoppedAt = 0;
  let previousActiveFrameTimestamp: number | null = null;
  let renderCpuDurations: number[] = [];
  let activeRenderIntervals: number[] = [];

  const snapshot = (): SceneMetricsSnapshot => ({
    label:
      'Main-thread CPU duration around renderer.render and rAF timestamp intervals between consecutive renders in active interpolation bursts.',
    recordingDurationMs: Math.max(0, recordingStoppedAt - recordingStartedAt),
    gpuRenderer,
    renderCpuDuration: statistics(renderCpuDurations),
    activeRenderInterval: statistics(activeRenderIntervals),
    percentileCalculation:
      'Nearest-rank percentile: sort ascending and select index max(0, ceil(p × n) - 1).',
  });

  return {
    controller: {
      start: () => {
        renderCpuDurations = [];
        activeRenderIntervals = [];
        previousActiveFrameTimestamp = null;
        recordingStartedAt = performance.now();
        recordingStoppedAt = recordingStartedAt;
        recording = true;
      },
      stop: () => {
        recordingStoppedAt = performance.now();
        recording = false;
        previousActiveFrameTimestamp = null;
        return snapshot();
      },
      snapshot,
    },
    record: (frameTimestamp, startedAt, endedAt) => {
      if (!recording) {
        return;
      }

      renderCpuDurations.push(endedAt - startedAt);
      if (previousActiveFrameTimestamp !== null) {
        activeRenderIntervals.push(
          frameTimestamp - previousActiveFrameTimestamp,
        );
      }
      previousActiveFrameTimestamp = frameTimestamp;
      recordingStoppedAt = endedAt;
    },
    markInactive: () => {
      previousActiveFrameTimestamp = null;
    },
  };
}

function statistics(samples: number[]): SampleStatistics {
  if (samples.length === 0) {
    return {
      sampleCount: 0,
      minimumMs: null,
      medianMs: null,
      p95Ms: null,
      maximumMs: null,
      meanMs: null,
    };
  }

  const ordered = [...samples].sort((left, right) => left - right);
  return {
    sampleCount: ordered.length,
    minimumMs: ordered[0],
    medianMs: nearestRank(ordered, 0.5),
    p95Ms: nearestRank(ordered, 0.95),
    maximumMs: ordered.at(-1) ?? null,
    meanMs: ordered.reduce((sum, value) => sum + value, 0) / ordered.length,
  };
}

function nearestRank(ordered: number[], percentile: number): number {
  const index = Math.max(0, Math.ceil(percentile * ordered.length) - 1);
  return ordered[index];
}
