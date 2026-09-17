import aframeURL from "../assets/vendor/aframe-1.8.0.min.js?url";
import { createWorld } from "./gallery-world.js";

// A software rasterizer costs time in proportion to the pixel count, so the gallery
// trades resolution for a usable frame rate when the browser has no GPU. Hosted CI
// runners and older machines take this path.
const SOFTWARE_DRIVER =
  /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|generic renderer/i;
const RENDER_PROFILES = {
  hardware: {
    renderer:
      "antialias: true; colorManagement: true; maxCanvasWidth: 2560; maxCanvasHeight: 1600",
    pixelBudget: 0,
    reflectionBudget: 600000,
  },
  software: {
    renderer:
      "antialias: false; colorManagement: true; maxCanvasWidth: 1280; maxCanvasHeight: 1280",
    pixelBudget: 240000,
    reflectionBudget: 50000,
  },
};

// An unknown driver keeps the full quality settings, so a hidden name never costs
// a visitor resolution.
function detectRenderProfile(context) {
  try {
    const info = context.getExtension("WEBGL_debug_renderer_info");
    if (!info) return "hardware";
    const name = String(context.getParameter(info.UNMASKED_RENDERER_WEBGL));
    return SOFTWARE_DRIVER.test(name) ? "software" : "hardware";
  } catch {
    return "hardware";
  }
}

let enginePromise;
function loadEngine() {
  if (window.AFRAME) return Promise.resolve();
  if (!enginePromise)
    enginePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const timeout = setTimeout(() => {
        script.remove();
        enginePromise = undefined;
        reject(new Error("The 3D engine took too long to load"));
      }, 15000);
      script.src = aframeURL;
      script.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timeout);
        script.remove();
        enginePromise = undefined;
        reject(new Error("Unable to load the 3D engine"));
      };
      document.head.append(script);
    });
  return enginePromise;
}

export async function createGallery(host, artworks, callbacks) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2");
  if (!context) throw new Error("WebGL 2 is unavailable");
  const profileName = detectRenderProfile(context);
  const profile = RENDER_PROFILES[profileName];
  context.getExtension("WEBGL_lose_context")?.loseContext();
  await loadEngine();
  const { THREE } = window.AFRAME;
  const backZ = Math.min(
    -22.5,
    1 - (Math.ceil(artworks.length / 2) - 1) * 7 - 2.5,
  );
  const benches = [];
  for (let z = -4.8; z > backZ + 4; z -= 10) benches.push(z);
  if (!AFRAME.components["gallery-boundary"])
    AFRAME.registerComponent("gallery-boundary", {
      schema: {
        minZ: { default: -23 },
        benches: { type: "array", default: [] },
      },
      init() {
        this.previous = new THREE.Vector3(0, 1.53, 5);
      },
      tick() {
        if (this.el.sceneEl.is("vr-mode")) return;
        const p = this.el.object3D.position;
        p.x = THREE.MathUtils.clamp(p.x, -4.8, 4.8);
        p.z = THREE.MathUtils.clamp(p.z, this.data.minZ, 5);
        p.y = 1.53;
        if (
          Math.abs(p.x) < 0.85 &&
          this.data.benches.some((z) => Math.abs(p.z - Number(z)) < 1.9)
        ) {
          p.copy(this.previous);
        }
        this.previous.copy(p);
      },
    });
  if (!AFRAME.components["gallery-keyboard-walk"])
    AFRAME.registerComponent("gallery-keyboard-walk", {
      schema: { speed: { default: 4.2 } },
      init() {
        this.keys = new Set();
        this.touchInput = new THREE.Vector2();
        this.onKeyDown = (event) => {
          if (!this.el.sceneEl.isPlaying || this.el.sceneEl.is("vr-mode"))
            return;
          if (
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.target?.closest?.(
              "input, textarea, select, [contenteditable]:not([contenteditable='false'])",
            )
          ) {
            this.keys.clear();
            return;
          }
          if (
            [
              "KeyW",
              "KeyA",
              "KeyS",
              "KeyD",
              "ArrowUp",
              "ArrowLeft",
              "ArrowDown",
              "ArrowRight",
            ].includes(event.code)
          ) {
            // After a pause/blur, require a fresh press, not a held-key repeat.
            if (!event.repeat) this.keys.add(event.code);
            event.preventDefault();
          }
        };
        this.onKeyUp = (event) => this.keys.delete(event.code);
        this.onBlur = () => {
          this.keys.clear();
          this.touchInput.set(0, 0);
        };
        // Bubbling keyboard events work even while a dialog button has focus.
        window.addEventListener("keydown", this.onKeyDown, { passive: false });
        window.addEventListener("keyup", this.onKeyUp);
        window.addEventListener("blur", this.onBlur);
        document.addEventListener("visibilitychange", this.onBlur);
        document.addEventListener("focusin", this.onBlur);
        this.el.sceneEl.addEventListener("enter-vr", this.onBlur);
      },
      pause() {
        this.onBlur();
      },
      tick(_time, delta) {
        if (
          !this.el.sceneEl.isPlaying ||
          this.el.sceneEl.is("vr-mode") ||
          (!this.keys.size && !this.touchInput.lengthSq())
        )
          return;
        const look = this.el.components["look-controls"];
        const yaw = look?.yawObject.rotation.y || 0;
        const forward =
          (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0) -
          (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) -
          this.touchInput.y;
        const strafe =
          (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
          (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0) +
          this.touchInput.x;
        const length = Math.max(1, Math.hypot(forward, strafe));
        const distance = (this.data.speed * Math.min(delta, 50)) / 1000;
        const x = (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) / length;
        const z = (Math.cos(yaw) * forward + Math.sin(yaw) * strafe) / length;
        this.el.object3D.position.x += x * distance;
        this.el.object3D.position.z -= z * distance;
        // Constrain the resulting position before rendering, regardless of tick order.
        this.el.components["gallery-boundary"]?.tick();
      },
      remove() {
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        window.removeEventListener("blur", this.onBlur);
        document.removeEventListener("visibilitychange", this.onBlur);
        document.removeEventListener("focusin", this.onBlur);
        this.el.sceneEl.removeEventListener("enter-vr", this.onBlur);
      },
    });
  const scene = document.createElement("a-scene");
  scene.setAttribute("embedded", "");
  scene.setAttribute("renderer", profile.renderer);
  scene.dataset.renderProfile = profileName;
  scene.setAttribute("background", "color: #dce0d5");
  scene.setAttribute("xr-mode-ui", "enabled: false");
  scene.setAttribute("loading-screen", "enabled: false");
  scene.setAttribute("device-orientation-permission-ui", "enabled: false");
  scene.setAttribute(
    "webxr",
    "optionalFeatures: local-floor, bounded-floor; referenceSpaceType: local-floor",
  );

  function entity(tag, attributes, parent = scene) {
    const el = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) =>
      el.setAttribute(key, value),
    );
    parent.append(el);
    return el;
  }
  function label(
    text,
    subtext,
    position,
    rotation,
    width = 2,
    parent = scene,
    dark = false,
  ) {
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 1024;
    labelCanvas.height = 256;
    const ctx = labelCanvas.getContext("2d");
    ctx.fillStyle = dark ? "#20231e" : "#f4f1e8";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = dark ? "#e8edcc" : "#20231e";
    ctx.font = "500 56px Manrope, sans-serif";
    ctx.fillText(text, 44, 106, 936);
    ctx.fillStyle = dark ? "#aeb79c" : "#666c5d";
    ctx.font = "400 30px Manrope, sans-serif";
    ctx.fillText(subtext, 44, 178, 936);
    const texture = new THREE.CanvasTexture(labelCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, width / 4),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    const el = entity("a-entity", { position, rotation }, parent);
    el.setObject3D("mesh", mesh);
    return el;
  }

  const assets = entity("a-assets", { timeout: "15000" });
  const images = await Promise.all(
    artworks.map(async (art, i) => {
      const img = new Image();
      img.id = `gallery-image-${i}`;
      img.src = art.image;
      await img.decode();
      assets.append(img);
      return img;
    }),
  );

  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 256;
  const shadowContext = shadowCanvas.getContext("2d");
  shadowContext.filter = "blur(12px)";
  shadowContext.fillStyle = "rgba(22, 17, 12, .5)";
  shadowContext.fillRect(24, 24, 208, 208);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);

  const world = await createWorld(THREE, scene, {
    backZ,
    benches,
    reflectionBudget: profile.reflectionBudget,
  });
  // Two shared lights shade the frames and upholstery. Architecture is lightmapped.
  entity("a-light", {
    type: "hemisphere",
    color: "#f0f4ff",
    "ground-color": "#66513c",
    intensity: 2.0,
  });
  entity("a-light", {
    type: "directional",
    position: "-3 8 4",
    color: "#ffe4bc",
    intensity: 2.1,
  });
  label(
    "roomkey",
    "HUMAN CURIOSITY. DIGITAL POSSIBILITY.",
    `0 2.9 ${backZ + 0.13}`,
    "0 0 0",
    6,
    scene,
    true,
  );
  label(
    `${callbacks.roomTitle || "Roomkey"} / THE COLLECTION`,
    `${artworks.length} ${artworks.length === 1 ? "work" : "works"}. A different way to see.`,
    `0 1.55 ${backZ + 0.14}`,
    "0 0 0",
    3.5,
  );

  const frames = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({
      color: "#25221e",
      roughness: 0.45,
      metalness: 0.25,
    }),
    artworks.length,
  );
  const frameEdges = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({
      color: "#b49b74",
      roughness: 0.4,
      metalness: 0.35,
    }),
    artworks.length,
  );
  const frameShadows = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    }),
    artworks.length,
  );
  scene.object3D.add(frames, frameEdges, frameShadows);
  const placements = artworks.map((art, i) => {
    const left = i < Math.ceil(artworks.length / 2);
    const slot = left ? i : i - Math.ceil(artworks.length / 2);
    const z = slot === 0 ? -0.5 : 1 - slot * 7;
    const x = left ? -5.84 : 5.84;
    const rotation = left ? 90 : -90;
    const ratio = images[i].naturalWidth / images[i].naturalHeight;
    const width = ratio >= 1 ? 3.35 : 2.45 * ratio;
    const height = width / ratio;
    const group = entity("a-entity", {
      position: `${x} 2.5 ${z}`,
      rotation: `0 ${rotation} 0`,
    });
    const placement = new THREE.Matrix4().compose(
      new THREE.Vector3(x, 2.5, z),
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        THREE.MathUtils.degToRad(rotation),
      ),
      new THREE.Vector3(1, 1, 1),
    );
    frames.setMatrixAt(
      i,
      placement
        .clone()
        .scale(new THREE.Vector3(width + 0.17, height + 0.17, 0.09)),
    );
    frameEdges.setMatrixAt(
      i,
      placement
        .clone()
        .multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.06))
        .scale(new THREE.Vector3(width + 0.07, height + 0.07, 0.04)),
    );
    frameShadows.setMatrixAt(
      i,
      placement
        .clone()
        .multiply(new THREE.Matrix4().makeTranslation(0, -0.05, -0.025))
        .scale(new THREE.Vector3(width + 0.65, height + 0.65, 1)),
    );
    const painting = entity(
      "a-image",
      {
        src: `#gallery-image-${i}`,
        width,
        height,
        position: "0 0 .084",
        class: "inspectable",
        material: "shader: flat",
      },
      group,
    );
    painting.addEventListener("click", () => {
      currentIndex = i;
      callbacks.onSelect(i);
      callbacks.onInspect(i);
    });
    label(
      art.title,
      `${art.artist} / ${art.created}`,
      `${width / 2 - 0.7} ${-height / 2 - 0.38} .08`,
      "0 0 0",
      1.4,
      group,
    );
    return {
      x: left ? -1.8 : 1.8,
      z: 1 - slot * 7,
      targetX: x,
      targetZ: z,
      rotation,
    };
  });

  const rig = entity("a-entity", { id: "gallery-rig" });
  const camera = entity(
    "a-camera",
    {
      id: "gallery-camera",
      position: "0 1.53 5",
      fov: 60,
      "wasd-controls": "enabled: false",
      "gallery-keyboard-walk": "speed: 4.2",
      "look-controls":
        "pointerLockEnabled: false; magicWindowTrackingEnabled: false",
      "gallery-boundary": `minZ: ${backZ + 1}; benches: ${benches.join(",")}`,
    },
    rig,
  );
  // Controller rays inspect paintings; thumbstick navigation supports seated VR.
  for (const hand of ["left", "right"]) {
    const controller = entity(
      "a-entity",
      {
        "laser-controls": `hand: ${hand}`,
        raycaster: "objects: .inspectable; far: 20",
        line: "color: #e8edcc",
      },
      rig,
    );
    let ready = true;
    controller.addEventListener("thumbstickmoved", (e) => {
      if (Math.abs(e.detail.y) < 0.3) ready = true;
      if (ready && Math.abs(e.detail.y) > 0.8) {
        visit(e.detail.y > 0 ? -1 : 1);
        ready = false;
      }
    });
  }

  let currentIndex = 0;
  function visit(offset) {
    currentIndex = (currentIndex + offset + artworks.length) % artworks.length;
    const p = placements[currentIndex];
    if (scene.is("vr-mode")) {
      rig.object3D.position.set(p.x, 0, p.z);
      camera.object3D.position.set(0, 1.65, 0);
      rig.object3D.rotation.y = THREE.MathUtils.degToRad(p.rotation);
    } else {
      rig.object3D.position.set(0, 0, 0);
      rig.object3D.rotation.set(0, 0, 0);
      camera.object3D.position.set(
        host.clientWidth < 760 ? -Math.sign(p.x) * 1.2 : p.x,
        1.53,
        p.z,
      );
      const look = camera.components["look-controls"];
      const dx = p.targetX - camera.object3D.position.x;
      const dz = p.targetZ - camera.object3D.position.z;
      look.yawObject.rotation.y = Math.atan2(-dx, -dz);
      look.pitchObject.rotation.x = Math.atan2(0.97, Math.hypot(dx, dz));
    }
    callbacks.onSelect(currentIndex);
  }

  const loaded = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Gallery initialization timed out")),
      20000,
    );
    scene.addEventListener(
      "renderstart",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
  host.replaceChildren(scene);
  try {
    await loaded;
  } catch (error) {
    world.dispose();
    scene.remove();
    throw error;
  }
  scene.canvas.addEventListener("webglcontextlost", callbacks.onError);
  // A-Frame fixes the pixel ratio once, at renderer setup. The software profile
  // holds its own ratio across the first layout and every later resize. A headset
  // owns its own resolution, so the budget steps aside while it presents.
  function applyPixelBudget() {
    if (!profile.pixelBudget || scene.renderer.xr.isPresenting) return;
    const width = scene.canvas.clientWidth;
    const height = scene.canvas.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      Math.max(0.5, Math.sqrt(profile.pixelBudget / (width * height))),
    );
    if (Math.abs(scene.renderer.getPixelRatio() - ratio) < 0.01) return;
    scene.renderer.setPixelRatio(ratio);
    scene.resize();
    world.invalidate();
  }
  window.addEventListener("resize", applyPixelBudget);
  applyPixelBudget();
  world.prepare(scene.renderer);
  scene.galleryWorld = world;
  scene.canvas.tabIndex = 0;
  scene.canvas.setAttribute(
    "aria-label",
    "Gallery: WASD to walk, drag to look, E to inspect, Tab for guide",
  );
  camera.components["look-controls"].pitchObject.rotation.x = 0.038;
  // A-Frame may upload artwork textures during its first render; refresh the cache.
  world.invalidate();
  // Pick on pointer release using the current camera, so even quick taps work.
  // Movement beyond six pixels is a look gesture, never an artwork selection.
  const picker = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let gesture;
  scene.canvas.addEventListener("pointerdown", (event) => {
    if (event.isPrimary && event.button === 0)
      gesture = { x: event.clientX, y: event.clientY, moved: false };
  });
  scene.canvas.addEventListener("pointermove", (event) => {
    if (
      gesture &&
      Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6
    )
      gesture.moved = true;
  });
  scene.canvas.addEventListener("pointercancel", () => {
    gesture = undefined;
  });
  scene.canvas.addEventListener("pointerup", (event) => {
    const select =
      gesture && !gesture.moved && !scene.is("vr-mode") && scene.isPlaying;
    gesture = undefined;
    if (!select) return;
    const bounds = scene.canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    scene.object3D.updateMatrixWorld(true);
    picker.setFromCamera(pointer, scene.camera);
    const paintings = [...scene.querySelectorAll("a-image.inspectable")];
    const hit = picker.intersectObjects(
      paintings.map((painting) => painting.getObject3D("mesh")),
      false,
    )[0];
    if (hit) {
      const index = paintings.findIndex(
        (painting) => painting.getObject3D("mesh") === hit.object,
      );
      currentIndex = index;
      callbacks.onSelect(index);
      callbacks.onInspect(index);
    }
  });
  scene.addEventListener("exit-vr", () => visit(0));
  let supportsVR = false;
  try {
    supportsVR =
      (await navigator.xr?.isSessionSupported("immersive-vr")) || false;
  } catch {
    /* Screen-based exploration stays available. */
  }
  callbacks.onSelect(0);
  if (host.clientWidth < 760) visit(0);
  return {
    get index() {
      return currentIndex;
    },
    supportsVR,
    visit,
    setWalkInput(x, y) {
      if (scene.isPlaying)
        camera.components["gallery-keyboard-walk"].touchInput.set(x, y);
    },
    pause() {
      scene.pause();
      scene.renderer.setAnimationLoop(null);
      if (scene.is("vr-mode")) scene.exitVR();
    },
    resume() {
      scene.play();
      scene.resize();
      scene.renderer.setAnimationLoop(scene.render);
    },
    enterVR() {
      return scene.enterVR();
    },
    destroy() {
      window.removeEventListener("resize", applyPixelBudget);
      scene.canvas.removeEventListener("webglcontextlost", callbacks.onError);
      scene.pause();
      scene.renderer.setAnimationLoop(null);
      world.dispose();
      scene.object3D.traverse((object) => {
        if (object.isInstancedMesh) object.dispose();
        object.geometry?.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of materials) {
          material?.map?.dispose();
          material?.dispose();
        }
      });
      scene.renderer.dispose();
      scene.remove();
    },
  };
}
