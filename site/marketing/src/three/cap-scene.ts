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
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  PMREMGenerator,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface CapKeyframe {
  cameraZ: number;
  cameraX: number;
  cameraY: number;
  fov: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  modelX: number;
  modelY: number;
  scale: number;
  keyIntensity: number;
  fillIntensity: number;
  rimIntensity: number;
  exposure: number;
  chapter: string;
}

export const CAP_KEYFRAMES: CapKeyframe[] = [
  {
    chapter: 'arrival',
    cameraZ: 6.7,
    cameraX: 0,
    cameraY: 0.08,
    fov: 32,
    rotationX: -0.16,
    rotationY: -0.34,
    rotationZ: 0.045,
    modelX: 0.42,
    modelY: -0.18,
    scale: 1,
    keyIntensity: 4.6,
    fillIntensity: 1.55,
    rimIntensity: 58,
    exposure: 1.22,
  },
  {
    chapter: 'pull-back',
    cameraZ: 8.4,
    cameraX: 0.15,
    cameraY: 0.2,
    fov: 34,
    rotationX: -0.12,
    rotationY: -0.22,
    rotationZ: 0.03,
    modelX: 0.55,
    modelY: -0.12,
    scale: 0.92,
    keyIntensity: 4.2,
    fillIntensity: 1.7,
    rimIntensity: 48,
    exposure: 1.18,
  },
  {
    chapter: 'side',
    cameraZ: 7.2,
    cameraX: 0.85,
    cameraY: 0.05,
    fov: 33,
    rotationX: -0.08,
    rotationY: 0.42,
    rotationZ: 0.02,
    modelX: 1.1,
    modelY: -0.22,
    scale: 0.88,
    keyIntensity: 3.8,
    fillIntensity: 1.85,
    rimIntensity: 42,
    exposure: 1.14,
  },
  {
    chapter: 'silhouette',
    cameraZ: 8.6,
    cameraX: 0.2,
    cameraY: 0.1,
    fov: 36,
    rotationX: -0.05,
    rotationY: 0.55,
    rotationZ: 0,
    modelX: 1.25,
    modelY: -0.28,
    scale: 0.78,
    keyIntensity: 1.2,
    fillIntensity: 0.85,
    rimIntensity: 18,
    exposure: 0.72,
  },
  {
    chapter: 'return',
    cameraZ: 6.9,
    cameraX: 0,
    cameraY: 0.06,
    fov: 32,
    rotationX: -0.14,
    rotationY: -0.28,
    rotationZ: 0.04,
    modelX: 0.45,
    modelY: -0.16,
    scale: 0.95,
    keyIntensity: 4.4,
    fillIntensity: 1.5,
    rimIntensity: 52,
    exposure: 1.16,
  },
];

/** One keyframe per visible narrative frame (01–03, 05–06). */
const KEYFRAME_PROGRESS = [0, 0.25, 0.5, 0.75, 1];

/** Radians per millisecond — one full Y turn in ~120s; secondary to pointer orbit. */
const IDLE_SPIN_Y_PER_MS = 0.000052;

/** Pointer orbit bounds (normalized device coords, -1..1). Rotation dominates; position is subtle depth. */
const POINTER_PARALLAX = {
  rotationX: 0.36,
  rotationY: 0.48,
  rotationZ: 0.1,
  positionX: 0.03,
  positionY: 0.02,
  cameraX: 0.015,
  cameraY: 0.01,
  rimX: 0.38,
  rimY: 0.22,
} as const;

/** Pointer follow smoothing — higher = more responsive orbit feel. */
const POINTER_LERP = 0.13;

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
  scrollProgress: number;
  totalRenderCount: number;
  lastRenderAt: number | null;
  renderScheduled: boolean;
  environmentReady: boolean;
  contactShadowEnabled: boolean;
  revealedAt: number | null;
}

declare global {
  interface Window {
    __scholarSceneMetrics?: SceneMetricsController;
    __scholarSceneState?: { snapshot: () => SceneStateSnapshot };
  }
}

export interface CapSceneController {
  setScrollProgress: (progress: number) => void;
  dispose: () => void;
}

export function interpolateCapState(progress: number): CapKeyframe {
  const clamped = MathUtils.clamp(progress, 0, 1);
  let segment = 0;

  for (let index = 0; index < KEYFRAME_PROGRESS.length - 1; index += 1) {
    if (clamped >= KEYFRAME_PROGRESS[index] && clamped <= KEYFRAME_PROGRESS[index + 1]) {
      segment = index;
      break;
    }
    if (index === KEYFRAME_PROGRESS.length - 2) {
      segment = index;
    }
  }

  const start = KEYFRAME_PROGRESS[segment];
  const end = KEYFRAME_PROGRESS[segment + 1];
  const localT = end === start ? 1 : (clamped - start) / (end - start);
  const eased = 1 - Math.pow(1 - localT, 2);
  const from = CAP_KEYFRAMES[segment];
  const to = CAP_KEYFRAMES[segment + 1] ?? from;

  return {
    chapter: eased < 0.5 ? from.chapter : to.chapter,
    cameraZ: MathUtils.lerp(from.cameraZ, to.cameraZ, eased),
    cameraX: MathUtils.lerp(from.cameraX, to.cameraX, eased),
    cameraY: MathUtils.lerp(from.cameraY, to.cameraY, eased),
    fov: MathUtils.lerp(from.fov, to.fov, eased),
    rotationX: MathUtils.lerp(from.rotationX, to.rotationX, eased),
    rotationY: MathUtils.lerp(from.rotationY, to.rotationY, eased),
    rotationZ: MathUtils.lerp(from.rotationZ, to.rotationZ, eased),
    modelX: MathUtils.lerp(from.modelX, to.modelX, eased),
    modelY: MathUtils.lerp(from.modelY, to.modelY, eased),
    scale: MathUtils.lerp(from.scale, to.scale, eased),
    keyIntensity: MathUtils.lerp(from.keyIntensity, to.keyIntensity, eased),
    fillIntensity: MathUtils.lerp(from.fillIntensity, to.fillIntensity, eased),
    rimIntensity: MathUtils.lerp(from.rimIntensity, to.rimIntensity, eased),
    exposure: MathUtils.lerp(from.exposure, to.exposure, eased),
  };
}

export async function createCapScene(
  sceneCanvas: HTMLCanvasElement,
  sceneContainer: HTMLElement,
): Promise<CapSceneController | null> {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!supportsWebGL()) {
    showFallback();
    return null;
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
    return null;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.08, 6.7);

  const pmremGenerator = new PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnvironment = new RoomEnvironment();
  const environmentMap = pmremGenerator.fromScene(roomEnvironment, 0.045).texture;
  scene.environment = environmentMap;
  roomEnvironment.dispose();
  pmremGenerator.dispose();

  const ambientLight = new HemisphereLight(0x6683aa, 0x01040b, 0.38);
  const goldKeyLight = new DirectionalLight(0xffd791, 4.6);
  goldKeyLight.position.set(4.2, 5.2, 4.5);
  goldKeyLight.castShadow = true;
  goldKeyLight.shadow.mapSize.set(1024, 1024);
  goldKeyLight.shadow.camera.near = 0.5;
  goldKeyLight.shadow.camera.far = 14;
  goldKeyLight.shadow.camera.left = -3.5;
  goldKeyLight.shadow.camera.right = 3.5;
  goldKeyLight.shadow.camera.top = 3.5;
  goldKeyLight.shadow.camera.bottom = -3.5;
  goldKeyLight.shadow.bias = -0.0007;
  goldKeyLight.shadow.normalBias = 0.035;

  const coolFillLight = new DirectionalLight(0x5277aa, 1.55);
  coolFillLight.position.set(-4.5, -1.8, 3.8);
  const goldRimLight = new PointLight(0xffbf58, 58, 12, 1.65);
  goldRimLight.position.set(3.6, 2.4, -2.8);
  scene.add(ambientLight, goldKeyLight, coolFillLight, goldRimLight);

  const shadowMaterial = new ShadowMaterial({
    color: new Color(0x00030a),
    opacity: 0.32,
  });
  const contactShadow = new Mesh(new PlaneGeometry(6.2, 4.2), shadowMaterial);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0.35, -1.22, 0.15);
  contactShadow.receiveShadow = true;
  scene.add(contactShadow);

  const metrics = createSceneMetrics(readGpuRenderer(renderer));
  window.__scholarSceneMetrics = metrics.controller;

  const sceneState: SceneStateSnapshot = {
    initialisedAt: performance.now(),
    modelReadyAt: null,
    arrivalStartedAt: null,
    arrivalSettledAt: null,
    scrollProgress: 0,
    totalRenderCount: 0,
    lastRenderAt: null,
    renderScheduled: false,
    environmentReady: Boolean(scene.environment),
    contactShadowEnabled: renderer.shadowMap.enabled && contactShadow.receiveShadow,
    revealedAt: null,
  };
  window.__scholarSceneState = { snapshot: () => ({ ...sceneState }) };

  let model: Group | null = null;
  let animationFrame: number | null = null;
  let disposed = false;
  let contextAvailable = true;
  let arrivalStartedAt = 0;
  let renderedFrameCount = 0;
  let sceneRevealed = false;
  let baseScale = 1;
  let scrollProgress = 0;
  let targetScrollProgress = 0;
  const pointerTarget = new Vector2();
  const pointerCurrent = new Vector2();
  const baseRotation = new Euler(-0.16, -0.34, 0.045);

  const applyState = (
    state: CapKeyframe,
    arrivalEase: number,
    idleSpinY: number,
    enablePointerParallax: boolean,
  ): void => {
    if (!model) {
      return;
    }

    const responsiveScale = window.innerWidth <= 768 ? 0.9 : 1;
    const arrivalScale = reducedMotion.matches ? 1 : 0.93 + 0.07 * arrivalEase;
    const pointerX = enablePointerParallax ? pointerCurrent.x : 0;
    const pointerY = enablePointerParallax ? pointerCurrent.y : 0;

    model.position.set(
      state.modelX + pointerX * POINTER_PARALLAX.positionX,
      state.modelY + pointerY * POINTER_PARALLAX.positionY,
      0,
    );
    model.scale.setScalar(baseScale * responsiveScale * state.scale * arrivalScale);
    model.rotation.set(
      state.rotationX + pointerY * POINTER_PARALLAX.rotationX,
      state.rotationY + idleSpinY + pointerX * POINTER_PARALLAX.rotationY,
      state.rotationZ + pointerX * pointerY * POINTER_PARALLAX.rotationZ,
    );

    camera.position.set(
      state.cameraX + pointerX * POINTER_PARALLAX.cameraX,
      state.cameraY + pointerY * POINTER_PARALLAX.cameraY,
      state.cameraZ,
    );
    camera.fov = state.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(state.modelX * 0.4, state.modelY * 0.5, 0);

    goldKeyLight.intensity = state.keyIntensity;
    coolFillLight.intensity = state.fillIntensity;
    goldRimLight.intensity = state.rimIntensity;
    renderer.toneMappingExposure = state.exposure;

    goldRimLight.position.x = 3.6 + pointerX * POINTER_PARALLAX.rimX;
    goldRimLight.position.y = 2.4 + pointerY * POINTER_PARALLAX.rimY;

    document.documentElement.dataset.scrollChapter = state.chapter;
  };

  const render = (time: number): void => {
    animationFrame = null;
    sceneState.renderScheduled = false;

    if (disposed || !model || !contextAvailable || document.visibilityState !== 'visible') {
      metrics.markInactive();
      return;
    }

    const reduce = reducedMotion.matches;
    const arrivalProgress = reduce ? 1 : Math.min((time - arrivalStartedAt) / 1200, 1);
    const arrivalEase = 1 - Math.pow(1 - arrivalProgress, 3);
    const enablePointerParallax = !reduce && finePointer.matches;
    const idleSpinY = reduce ? 0 : time * IDLE_SPIN_Y_PER_MS;

    scrollProgress = reduce
      ? targetScrollProgress
      : MathUtils.lerp(scrollProgress, targetScrollProgress, 0.12);

    pointerCurrent.lerp(pointerTarget, reduce ? 1 : POINTER_LERP);
    sceneState.scrollProgress = scrollProgress;

    const state = interpolateCapState(scrollProgress);
    applyState(state, arrivalEase, idleSpinY, enablePointerParallax);

    const pointerDelta = pointerCurrent.distanceTo(pointerTarget);
    const scrollDelta = Math.abs(targetScrollProgress - scrollProgress);
    const keepRendering =
      !reduce ||
      arrivalProgress < 1 ||
      pointerDelta > 0.001 ||
      scrollDelta > 0.0008;

    if (keepRendering) {
      scheduleRender();
    }

    const renderStartedAt = performance.now();
    renderer.render(scene, camera);
    metrics.record(time, renderStartedAt, performance.now());
    sceneState.totalRenderCount += 1;
    sceneState.lastRenderAt = performance.now();
    renderedFrameCount += 1;

    if (!sceneRevealed && renderedFrameCount >= 2) {
      sceneRevealed = true;
      sceneState.revealedAt = performance.now();
      document.documentElement.classList.remove('scene-fallback');
      document.documentElement.classList.remove('scene-static');
      document.documentElement.classList.add('scene-ready');
    } else if (!sceneRevealed) {
      scheduleRender();
    }

    if (arrivalProgress >= 1 && sceneState.arrivalSettledAt === null) {
      sceneState.arrivalSettledAt = performance.now();
    }

    if (!keepRendering) {
      metrics.markInactive();
    }
  };

  const scheduleRender = (): void => {
    if (animationFrame === null && !disposed && document.visibilityState === 'visible') {
      animationFrame = window.requestAnimationFrame(render);
      sceneState.renderScheduled = true;
    }
  };

  const resize = (): void => {
    const width = Math.max(1, sceneContainer.clientWidth || window.innerWidth);
    const height = Math.max(1, sceneContainer.clientHeight || window.innerHeight);
    const renderScale = 0.68;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setSize(
      Math.max(1, Math.round(width * renderScale)),
      Math.max(1, Math.round(height * renderScale)),
      false,
    );
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
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

  const finePointer = window.matchMedia('(pointer: fine)');

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
      renderedFrameCount = 0;
      sceneRevealed = false;
      sceneState.revealedAt = null;
      document.documentElement.classList.remove('scene-fallback');
      document.documentElement.classList.add('scene-static');
      document.documentElement.classList.remove('scene-ready');
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
    environmentMap.dispose();
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
      return null;
    }

    const loadedModel = gltf.scene;
    prepareModel(loadedModel);

    const bounds = new Box3().setFromObject(loadedModel);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    loadedModel.position.sub(center);

    model = new Group();
    model.add(loadedModel);
    baseScale = 3.15 / Math.max(size.x, size.y, size.z);
    model.rotation.copy(baseRotation);
    scene.add(model);

    arrivalStartedAt = performance.now();
    sceneState.modelReadyAt = arrivalStartedAt;
    sceneState.arrivalStartedAt = arrivalStartedAt;
    resize();
    scheduleRender();
  } catch (error) {
    console.warn('O objeto 3D não pôde ser carregado; exibindo a composição estática.', error);
    showFallback();
    return null;
  }

  return {
    setScrollProgress: (progress: number) => {
      targetScrollProgress = MathUtils.clamp(progress, 0, 1);
      sceneState.arrivalSettledAt = null;
      scheduleRender();
    },
    dispose,
  };
}

function prepareModel(root: Object3D): void {
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
          material.color.set(0xd9a94f);
          material.metalness = 0.96;
          material.roughness = 0.24;
          material.envMapIntensity = 1.2;
        } else if (material.map) {
          material.color.set(0xffffff);
          material.metalness = 0;
          material.roughness = 0.62;
          material.envMapIntensity = 0.88;
          applyTextureSurfaceProfile(material);
        } else {
          material.color.set(0x071326);
          material.metalness = 0;
          material.roughness = 0.62;
          material.envMapIntensity = 0.78;
        }

        material.needsUpdate = true;
      }
    });
  });
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
  diffuseColor.rgb * vec3(0.42, 0.58, 0.84),
  diffuseColor.rgb * vec3(1.08, 0.97, 0.76),
  scholarSurfaceGold
);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor = mix(0.64, 0.24, scholarGoldMask(diffuseColor.rgb));`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
metalnessFactor = mix(0.0, 0.96, scholarGoldMask(diffuseColor.rgb));`,
      );
  };
  material.customProgramCacheKey = () => 'scholar-premium-cap-surface-v2';
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
        activeRenderIntervals.push(frameTimestamp - previousActiveFrameTimestamp);
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
