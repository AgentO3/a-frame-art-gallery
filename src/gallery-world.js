import plasterURL from "../assets/materials/plaster.webp?url";
import plasterNormalURL from "../assets/materials/plaster-normal.webp?url";
import marbleURL from "../assets/materials/marble.webp?url";
import marbleRoughnessURL from "../assets/materials/marble-roughness.webp?url";

// Architectural light is baked analytically into the materials. It costs the
// same for a long exhibition as a short one: no per-artwork lights or shadow maps.
export async function createWorld(
  THREE,
  scene,
  { backZ, benches, reflectionBudget = 600000 },
) {
  const root = new THREE.Group();
  root.name = "Gallery architecture";
  const loader = new THREE.TextureLoader();
  const textures = await Promise.all(
    [plasterURL, plasterNormalURL, marbleURL, marbleRoughnessURL].map((url) =>
      loader.loadAsync(url),
    ),
  );
  textures.forEach((texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
  });
  const [plaster, plasterNormal, marble, marbleRoughness] = textures;
  plaster.colorSpace = marble.colorSpace = THREE.SRGBColorSpace;
  const vertex = `
    varying vec3 vWorld;
    varying vec3 vNormalWorld;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      vNormalWorld = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `;
  const wallMaterial = new THREE.ShaderMaterial({
    uniforms: {
      surface: { value: plaster },
      relief: { value: plasterNormal },
      backZ: { value: backZ },
    },
    vertexShader: vertex,
    fragmentShader: `
      uniform sampler2D surface;
      uniform sampler2D relief;
      uniform float backZ;
      varying vec3 vWorld;
      varying vec3 vNormalWorld;
      void main() {
        bool side = abs(vNormalWorld.x) > .5;
        bool ceiling = abs(vNormalWorld.y) > .5;
        vec2 uv = (ceiling ? vWorld.xz : (side ? vWorld.zy : vWorld.xy)) / 2.4;
        vec3 stone = mix(vec3(.34, .32, .28), texture2D(surface, uv).rgb, .45);
        vec3 bump = texture2D(relief, uv).rgb * 2.0 - 1.0;
        float grain = clamp(1.0 + bump.x * .32 + bump.y * .26, .75, 1.25);
        float light;
        if (ceiling) {
          light = .32 + .65 * exp(-pow((abs(vWorld.x) - 2.05) / .6, 2.0));
          light += .13 * cos(vWorld.z * 1.8);
        } else {
          float along = side ? vWorld.z - 1.0 : vWorld.x;
          float nearest = mod(along + 1.75, 3.5) - 1.75;
          float spread = .16 + max(0.0, 4.95 - vWorld.y) * .3;
          float pool = exp(-pow(nearest / spread, 2.0)) * exp(-pow((vWorld.y - 3.5) / 2.7, 2.0));
          light = .58 + 2.0 * pool;
          light *= .64 + .36 * smoothstep(.12, .65, vWorld.y);
          light *= .8 + .2 * smoothstep(backZ, backZ + .9, vWorld.z);
          light *= .78 + .22 * (1.0 - smoothstep(4.6, 5.2, vWorld.y));
        }
        vec3 tint = ceiling ? vec3(1.02, .86, .7) : vec3(1.04, .98, .88);
        gl_FragColor = vec4(stone * tint * light * grain, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: "#17120d",
    roughness: 0.4,
    metalness: 0.45,
    envMapIntensity: 0.35,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: "#b5a38a",
    roughness: 0.35,
    metalness: 0.5,
  });
  const base = new THREE.MeshStandardMaterial({
    color: "#555553",
    map: marble,
    roughness: 0.4,
    metalness: 0.2,
    envMapIntensity: 0.4,
  });
  const leather = new THREE.MeshStandardMaterial({
    color: "#60331b",
    roughness: 0.32,
    metalness: 0.05,
    envMapIntensity: 0.45,
  });
  const lens = new THREE.MeshBasicMaterial({ color: "#fff1d0" });
  const mullion = new THREE.MeshBasicMaterial({ color: "#8d9ca2" });
  const reveal = new THREE.MeshBasicMaterial({ color: "#d7d0c1" });
  const batches = new Map();
  const lampPositions = [];
  function add(geometry, material, position, rotation = [0, 0, 0]) {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(1, 1, 1),
    );
    geometry.applyMatrix4(matrix);
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(geometry);
  }
  const box = (size, position, material, rotation) =>
    add(new THREE.BoxGeometry(...size), material, position, rotation);
  const length = 7 - backZ;
  const center = (7 + backZ) / 2;
  box([0.2, 5.2, length], [-6, 2.6, center], wallMaterial);
  box([0.2, 5.2, length], [6, 2.6, center], wallMaterial);
  box([12, 5.2, 0.2], [0, 2.6, backZ], wallMaterial);
  box([12, 5.2, 0.2], [0, 2.6, 7], wallMaterial);
  box([12, 0.22, 0.08], [0, 0.11, backZ + 0.13], base);
  box([12, 0.016, 0.09], [0, 0.226, backZ + 0.14], trim);
  for (const side of [-1, 1]) {
    box([0.08, 0.22, length], [side * 5.85, 0.11, center], base);
    box([0.09, 0.016, length], [side * 5.84, 0.226, center], trim);
    box([4, 0.22, length], [side * 4, 5.22, center], wallMaterial);
    box([0.12, 0.4, length], [side * 2.02, 5.28, center], reveal);
    box([0.065, 0.07, length], [side * 4.85, 4.99, center], metal);
    for (let z = 4.5; z > backZ + 0.8; z -= 3.5) {
      lampPositions.push(side * 4.942, 4.63, z + 0.04);
      box([0.055, 0.19, 0.055], [side * 4.85, 4.87, z], metal);
      add(
        new THREE.CylinderGeometry(0.075, 0.07, 0.19, 12),
        metal,
        [side * 4.9, 4.72, z],
        [-0.4, 0, -side * 0.45],
      );
      add(
        new THREE.CircleGeometry(0.06, 12),
        lens,
        [side * 4.942, 4.63, z + 0.04],
        [Math.PI / 2 - 0.4, -side * 0.45, 0],
      );
    }
  }
  for (let z = -3; z > backZ + 1; z -= 6) {
    box([12, 0.22, 0.24], [0, 4.98, z], metal);
  }
  for (let z = 6; z > backZ; z -= 3) {
    box([4, 0.06, 0.065], [0, 5.5, z], mullion);
  }
  for (const x of [-1.92, 1.92])
    box([0.05, 0.06, length], [x, 5.5, center], mullion);

  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 64;
  const glowContext = glowCanvas.getContext("2d");
  const glow = glowContext.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, "rgba(255, 247, 221, 1)");
  glow.addColorStop(0.18, "rgba(255, 237, 192, .65)");
  glow.addColorStop(0.4, "rgba(255, 220, 160, .16)");
  glow.addColorStop(1, "rgba(255, 211, 136, 0)");
  glowContext.fillStyle = glow;
  glowContext.fillRect(0, 0, 64, 64);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  textures.push(glowTexture);
  const glowGeometry = new THREE.BufferGeometry();
  glowGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(lampPositions, 3),
  );
  root.add(
    new THREE.Points(
      glowGeometry,
      new THREE.PointsMaterial({
        map: glowTexture,
        size: 0.3,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    ),
  );

  // Deterministic cloud texture, generated once, shared by the sky and reflection.
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 256;
  skyCanvas.height = 512;
  const ctx = skyCanvas.getContext("2d");
  const pixels = ctx.createImageData(256, 512);
  function hash(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function noise(x, y) {
    const ix = Math.floor(x),
      iy = Math.floor(y);
    let fx = x - ix,
      fy = y - iy;
    fx *= fx * (3 - 2 * fx);
    fy *= fy * (3 - 2 * fy);
    return (
      (hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx) * (1 - fy) +
      (hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx) * fy
    );
  }
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 256; x++) {
      let cloud = 0,
        amplitude = 0.6;
      for (let octave = 0; octave < 5; octave++) {
        cloud +=
          amplitude * noise((x / 42) * 2 ** octave, (y / 52) * 2 ** octave);
        amplitude *= 0.5;
      }
      cloud = THREE.MathUtils.smoothstep(cloud, 0.35, 0.83);
      const index = (y * 256 + x) * 4;
      pixels.data[index] = 146 + cloud * 104;
      pixels.data[index + 1] = 183 + cloud * 69;
      pixels.data[index + 2] = 209 + cloud * 44;
      pixels.data[index + 3] = 255;
    }
  ctx.putImageData(pixels, 0, 0);
  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  skyTexture.wrapT = THREE.RepeatWrapping;
  skyTexture.repeat.y = length / 8;
  textures.push(skyTexture);
  const sky = new THREE.MeshBasicMaterial({
    map: skyTexture,
    side: THREE.DoubleSide,
  });
  add(
    new THREE.PlaneGeometry(4, length),
    sky,
    [0, 5.58, center],
    [Math.PI / 2, 0, 0],
  );

  // Small rounded leather cushions produce real grazing highlights and seams.
  function cushion(width, height, depth) {
    const radius = 0.055;
    const geometry = new THREE.BoxGeometry(width, height, depth, 8, 4, 8);
    const p = geometry.attributes.position;
    const normal = new THREE.Vector3();
    const core = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      normal.fromBufferAttribute(p, i);
      core.set(
        THREE.MathUtils.clamp(
          normal.x,
          -width / 2 + radius,
          width / 2 - radius,
        ),
        THREE.MathUtils.clamp(
          normal.y,
          -height / 2 + radius,
          height / 2 - radius,
        ),
        THREE.MathUtils.clamp(
          normal.z,
          -depth / 2 + radius,
          depth / 2 - radius,
        ),
      );
      normal.sub(core).normalize().multiplyScalar(radius).add(core);
      if (normal.y > 0)
        normal.y -=
          0.018 * Math.exp(-((normal.x / 0.07) ** 2 + (normal.z / 0.07) ** 2));
      p.setXYZ(i, normal.x, normal.y, normal.z);
    }
    geometry.computeVertexNormals();
    return geometry;
  }
  for (const z of benches) {
    box([0.75, 0.34, 2.48], [0, 0.17, z], base);
    box([1.17, 0.04, 3.24], [0, 0.36, z], metal);
    for (let row = 0; row < 6; row++)
      for (const x of [-0.385, 0, 0.385]) {
        add(cushion(0.38, 0.24, 0.525), leather, [
          x,
          0.49,
          z - 1.335 + row * 0.535,
        ]);
      }
  }

  // Collapse static props to one draw per material instead of hundreds of entities.
  for (const [material, geometries] of batches) {
    const expanded = geometries.map((g) => (g.index ? g.toNonIndexed() : g));
    const merged = new THREE.BufferGeometry();
    for (const attribute of ["position", "normal", "uv"]) {
      const size = expanded[0].attributes[attribute].itemSize;
      const count = expanded.reduce(
        (sum, g) => sum + g.attributes[attribute].array.length,
        0,
      );
      const buffer = new Float32Array(count);
      let offset = 0;
      for (const g of expanded) {
        buffer.set(g.attributes[attribute].array, offset);
        offset += g.attributes[attribute].array.length;
      }
      merged.setAttribute(attribute, new THREE.BufferAttribute(buffer, size));
    }
    root.add(new THREE.Mesh(merged, material));
    new Set([...geometries, ...expanded]).forEach((g) => g.dispose());
  }

  const reflection = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  reflection.texture.name = "Cached gallery floor reflection";
  const textureMatrix = new THREE.Matrix4();
  const floorMaterial = new THREE.ShaderMaterial({
    uniforms: {
      surface: { value: marble },
      roughness: { value: marbleRoughness },
      reflection: { value: reflection.texture },
      reflectionMatrix: { value: textureMatrix },
      reflectionEnabled: { value: 1 },
      benchRange: {
        value: new THREE.Vector2(benches.at(-1) - 1.9, benches[0] + 1.9),
      },
      reflectionPixel: { value: new THREE.Vector2(1 / 1024, 1 / 576) },
    },
    vertexShader: `
      uniform mat4 reflectionMatrix;
      varying vec3 vWorld;
      varying vec4 vReflection;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vReflection = reflectionMatrix * world;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform sampler2D surface;
      uniform sampler2D roughness;
      uniform sampler2D reflection;
      uniform vec2 reflectionPixel;
      uniform float reflectionEnabled;
      uniform vec2 benchRange;
      varying vec3 vWorld;
      varying vec4 vReflection;
      void main() {
        vec2 tile = floor(vWorld.xz / 2.0);
        vec2 uv = vWorld.xz / 4.0 + vec2(sin(dot(tile, vec2(17.1, 39.2))), cos(dot(tile, vec2(13.7, 7.8))));
        vec3 stone = texture2D(surface, uv).rgb;
        float rough = texture2D(roughness, uv).r;
        vec2 seams = abs(fract(vWorld.xz / 2.0 + .5) - .5);
        vec2 aa = fwidth(vWorld.xz / 2.0);
        float seam = 1.0 - min(smoothstep(.003, .003 + aa.x, seams.x), smoothstep(.003, .003 + aa.y, seams.y));
        float pools = exp(-pow((abs(vWorld.x) - 5.25) / .65, 2.0)) *
          exp(-pow((mod(vWorld.z - 1.0 + 1.75, 3.5) - 1.75) / .75, 2.0));
        vec2 projected = vReflection.xy / vReflection.w;
        projected += (vec2(texture2D(roughness, uv * 1.3).r, texture2D(roughness, uv * 1.3 + .27).r) - .5) * .009;
        vec2 blur = reflectionPixel * (2.0 + rough * 8.0) * vec2(1.0, 2.5);
        vec3 reflected = texture2D(reflection, projected).rgb * .4;
        reflected += texture2D(reflection, projected + vec2(blur.x, 0.0)).rgb * .15;
        reflected += texture2D(reflection, projected - vec2(blur.x, 0.0)).rgb * .15;
        reflected += texture2D(reflection, projected + vec2(0.0, blur.y)).rgb * .15;
        reflected += texture2D(reflection, projected - vec2(0.0, blur.y)).rgb * .15;
        reflected *= 1.0 + .3 * smoothstep(.3, .7, dot(reflected, vec3(.2126, .7152, .0722)));
        vec3 view = normalize(cameraPosition - vWorld);
        float fresnel = .15 + .27 * pow(1.0 - max(view.y, 0.0), 2.0);
        vec3 color = stone * vec3(.55, .55, .55) + vec3(.85, .58, .3) * pools;
        color = mix(color, reflected, fresnel * reflectionEnabled * (1.0 - rough * .22));
        color = mix(color, vec3(.18, .15, .115), seam * .5);
        // Soft bench contact shadows, independent of reflection resolution.
        float benchDistance = abs(mod(vWorld.z + 4.8 + 5.0, 10.0) - 5.0);
        float benchMask = step(benchRange.x, vWorld.z) * step(vWorld.z, benchRange.y);
        color *= 1.0 - .55 * benchMask * exp(-pow(vWorld.x / .8, 4.0) - pow(benchDistance / 1.7, 4.0));
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, length),
    floorMaterial,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.001, center);
  floor.name = "Polished marble floor";
  root.add(floor);
  scene.object3D.add(root);
  const mirrorCamera = new THREE.PerspectiveCamera();
  const lastView = new THREE.Matrix4();
  const lastProjection = new THREE.Matrix4();
  const eye = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    up = new THREE.Vector3();
  let reflectionFrames = 0;
  let environment;
  floor.onBeforeRender = (renderer, world, camera) => {
    floorMaterial.uniforms.reflectionEnabled.value = renderer.xr.isPresenting
      ? 0
      : 1;
    if (renderer.xr.isPresenting) return;
    const pixels = renderer.domElement.width * renderer.domElement.height;
    const scale = Math.min(
      1,
      1024 / renderer.domElement.width,
      Math.sqrt(reflectionBudget / pixels),
    );
    const width = Math.max(1, Math.round(renderer.domElement.width * scale));
    const height = Math.max(1, Math.round(renderer.domElement.height * scale));
    const resized = width !== reflection.width || height !== reflection.height;
    if (resized) {
      reflection.setSize(width, height);
      floorMaterial.uniforms.reflectionPixel.value.set(1 / width, 1 / height);
    }
    if (
      !resized &&
      reflectionFrames &&
      lastView.equals(camera.matrixWorld) &&
      lastProjection.equals(camera.projectionMatrix)
    )
      return;
    camera.getWorldPosition(eye);
    camera.getWorldDirection(direction);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    eye.y *= -1;
    direction.y *= -1;
    up.y *= -1;
    mirrorCamera.position.copy(eye);
    mirrorCamera.up.copy(up);
    mirrorCamera.lookAt(direction.add(eye));
    mirrorCamera.projectionMatrix.copy(camera.projectionMatrix);
    mirrorCamera.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    mirrorCamera.updateMatrixWorld();
    textureMatrix
      .set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(mirrorCamera.projectionMatrix)
      .multiply(mirrorCamera.matrixWorldInverse);
    const target = renderer.getRenderTarget();
    const xrEnabled = renderer.xr.enabled;
    const autoClear = renderer.autoClear;
    floor.visible = false;
    renderer.xr.enabled = false;
    renderer.autoClear = true;
    renderer.setRenderTarget(reflection);
    renderer.render(world, mirrorCamera);
    renderer.setRenderTarget(target);
    renderer.xr.enabled = xrEnabled;
    renderer.autoClear = autoClear;
    floor.visible = true;
    lastView.copy(camera.matrixWorld);
    lastProjection.copy(camera.projectionMatrix);
    reflectionFrames++;
  };
  return {
    prepare(renderer) {
      // Bake the room's soft sky and lamp illumination into one small environment
      // map, giving leather and metal natural highlights with no live cube pass.
      floor.visible = false;
      const generator = new THREE.PMREMGenerator(renderer);
      try {
        environment = generator.fromScene(scene.object3D, 0.03, 0.1, 100);
        scene.object3D.environment = environment.texture;
      } finally {
        generator.dispose();
        floor.visible = true;
      }
      reflectionFrames = 0;
    },
    get reflectionFrames() {
      return reflectionFrames;
    },
    invalidate() {
      reflectionFrames = 0;
    },
    dispose() {
      floor.onBeforeRender = () => {};
      reflection.dispose();
      scene.object3D.environment = null;
      environment?.dispose();
      textures.forEach((texture) => texture.dispose());
      root.traverse((object) => {
        object.geometry?.dispose();
        object.material?.dispose();
      });
      root.removeFromParent();
    },
  };
}
