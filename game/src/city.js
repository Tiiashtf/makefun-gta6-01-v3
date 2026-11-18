// Seeded coastal city: 8x8-block grid, beach + sea, pier, marina, palms, landmarks.
// Fills G.buildings (AABB colliders) and G.landmarks. Deterministic from CFG.seed.
import * as THREE from '../vendor/three.module.min.js';
import { CFG, LANDMARKS, LANDMARK_BLOCKS } from './config.js';
import { makeRng } from './random.js';

const PALETTE = [0x8a7f72, 0x9c8f7a, 0x7d8a99, 0xa89a80, 0x6f7f6a, 0xb0a08c, 0x8f7d6b, 0x7590a3, 0xc2b49a, 0x5f6f7a];

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  return m;
}

export function buildCity(G) {
  const rng = makeRng(CFG.seed);
  const scene = G.scene;
  G.buildings = [];
  G.colliders = [];
  G.landmarks = {};

  // Ground: asphalt city floor.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), new THREE.MeshLambertMaterial({ color: 0x3d4148 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 0); scene.add(ground);
  // Beach sand strip and sea.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(520, 40), new THREE.MeshLambertMaterial({ color: 0xdcc48f }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.05, 222); scene.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(560, 260), new THREE.MeshLambertMaterial({ color: 0x1e6f9e }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.4, 372); scene.add(sea);

  const addCollider = (x, z, w, d) => {
    const c = { x1: x - w / 2, z1: z - d / 2, x2: x + w / 2, z2: z + d / 2 };
    G.colliders.push(c); return c;
  };
  const addBuilding = (x, z, w, d, h, color, name) => {
    const b = box(w, h, d, color, x, h / 2, z); scene.add(b);
    const roof = box(w * 0.92, 0.8, d * 0.92, 0x2e3138, x, h + 0.4, z); scene.add(roof);
    const rec = { x, z, w, d, h, color, name: name || '' };
    G.buildings.push(rec); addCollider(x, z, w, d); return rec;
  };
  const isLandmarkBlock = (bx, bz) => LANDMARK_BLOCKS.some(([a, b]) => a === bx && b === bz);
  const avenueBand = (z, d) => (z - d / 2 < -96 && z + d / 2 > -112);

  // Random buildings, one block at a time.
  for (const bx of CFG.blockCenters) {
    for (const bz of CFG.blockCenters) {
      if (isLandmarkBlock(bx, bz)) continue;
      let n = 4; if (rng.chance(0.3)) n = 5;
      const placed = [];
      for (let i = 0; i < n; i++) {
        let ok = false, x = 0, z = 0, w = 0, d = 0;
        for (let tries = 0; tries < 12 && !ok; tries++) {
          w = 8 + rng.range(0, 7); d = 8 + rng.range(0, 7);
          x = bx + rng.range(-21 + w / 2 + 2, 21 - w / 2 - 2);
          z = bz + rng.range(-21 + d / 2 + 2, 21 - d / 2 - 2);
          if (avenueBand(z, d)) continue;
          ok = placed.every((p) => Math.abs(p.x - x) > (p.w + w) / 2 + 1.5 || Math.abs(p.z - z) > (p.d + d) / 2 + 1.5);
        }
        if (!ok) continue;
        const h = 8 + rng.range(0, 22);
        placed.push({ x, z, w, d });
        addBuilding(x, z, w, d, h, rng.pick(PALETTE));
      }
      // Sidewalk slab for the block.
      const slab = box(42, 0.3, 42, 0x9aa0a3, bx, 0.15, bz); scene.add(slab);
    }
  }

  // Landmarks.
  addBuilding(LANDMARKS.spire.x, LANDMARKS.spire.z, 18, 18, 95, 0x9fd8e8, 'Glass Spire');
  G.landmarks.spire = LANDMARKS.spire;
  addBuilding(0, 124, 24, 12, 9, 0xc25e3a, "Mara's Garage");
  G.landmarks.garage = LANDMARKS.garage;
  addBuilding(185, 60, 26, 18, 11, 0x7a6a55, 'The Docks');
  G.landmarks.docks = LANDMARKS.docks;
  // Dock containers.
  for (let i = 0; i < 5; i++) {
    const cx = 168 + rng.range(-8, 8), cz = 52 + i * 5.5;
    const c = box(8, 3, 3, rng.pick([0xb0402e, 0x2e6fb0, 0x3f8f4f]), cx, 1.5, cz); scene.add(c);
    addCollider(cx, cz, 8, 3);
  }
  addBuilding(-168, 118, 30, 16, 12, 0x4a4a52, 'Kaine Warehouse');
  G.landmarks.warehouse = LANDMARKS.warehouse;
  addBuilding(-56, -160, 20, 12, 8, 0xd8a03c, "Lou's Paint & Spray");
  G.landmarks.paint = LANDMARKS.paint;
  addBuilding(56, 0, 22, 14, 9, 0x5f8f6f, 'Solmar General');
  G.landmarks.general = LANDMARKS.general;
  addBuilding(0, 176, 18, 12, 7, 0xe8dcc0, 'Harbor Cafe');
  G.landmarks.cafe = LANDMARKS.cafe;
  // Sun Plaza fountain.
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 1, 20), new THREE.MeshLambertMaterial({ color: 0x8a8f96 }));
  rim.position.set(0, 0.5, 0); scene.add(rim);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.4, 20), new THREE.MeshLambertMaterial({ color: 0x3f9fd8 }));
  water.position.set(0, 0.9, 0); scene.add(water);
  addCollider(0, 0, 10, 10);
  G.landmarks.plaza = LANDMARKS.plaza;
  // Pier + lighthouse.
  for (let i = 0; i < 6; i++) scene.add(box(8, 0.6, 5, 0x8a6a45, 150, 0.6, 206 + i * 5));
  const light = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 16, 12), new THREE.MeshLambertMaterial({ color: 0xf0ead8 }));
  light.position.set(150, 8, 234); scene.add(light);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), new THREE.MeshLambertMaterial({ color: 0xffe9a0, emissive: 0xffc860 }));
  lamp.position.set(150, 17, 234); scene.add(lamp);
  addCollider(150, 234, 6, 6);
  G.landmarks.pier = LANDMARKS.pier;
  // Marina boats.
  for (let i = 0; i < 4; i++) {
    const bx2 = -170 + i * 14;
    scene.add(box(4, 1.6, 9, 0xf0f0f0, bx2, 0.4, 218));
    scene.add(box(0.4, 5, 0.4, 0x888888, bx2, 3, 218));
  }
  G.landmarks.marina = LANDMARKS.marina;

  // Palm trees along streets and the beach.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5c38 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4f });
  const palm = (x, z) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 6, 6), trunkMat);
    t.position.set(x, 3, z); scene.add(t);
    const l = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.4, 7), leafMat);
    l.position.set(x, 7.4, z); scene.add(l);
  };
  for (const s of CFG.streetLines) {
    for (let v = -180; v <= 180; v += 42) {
      if (Math.abs(v) < 12) continue;
      palm(s + 10.5, v + rng.range(-6, 6));
      if (rng.chance(0.6)) palm(v + rng.range(-6, 6), s + 10.5);
    }
  }
  for (let x = -200; x <= 200; x += 28) palm(x + rng.range(-4, 4), 208 + rng.range(0, 6));

  // Street centre dashes (thin pale boxes) so roads read at a glance.
  const dashMat = new THREE.MeshLambertMaterial({ color: 0xc8c8a0 });
  for (const s of CFG.streetLines) {
    for (let v = -196; v <= 196; v += 16) {
      const d1 = box(0.6, 0.06, 4, 0xc8c8a0, s, 0.06, v); scene.add(d1);
      const d2 = box(4, 0.06, 0.6, 0xc8c8a0, v, 0.06, s); scene.add(d2);
    }
  }
  void dashMat;

  return { buildings: G.buildings.length };
}

// Circle vs building AABBs: push a circle out of every collider it overlaps.
// Returns the corrected {x, z}. Also clamps to the world (sea edge at z=222).
export function collideCircle(G, x, z, r) {
  for (const c of G.colliders) {
    const nx = Math.max(c.x1, Math.min(x, c.x2));
    const nz = Math.max(c.z1, Math.min(z, c.z2));
    const dx = x - nx, dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r && d2 > 0.000001) {
      const d = Math.sqrt(d2);
      x = nx + (dx / d) * r; z = nz + (dz / d) * r;
    } else if (d2 <= 0.000001) {
      // Centre inside the box: push out along the smallest penetration axis.
      const pl = x - c.x1, pr = c.x2 - x, pt = z - c.z1, pb = c.z2 - z;
      const m = Math.min(pl, pr, pt, pb);
      if (m === pl) x = c.x1 - r; else if (m === pr) x = c.x2 + r;
      else if (m === pt) z = c.z1 - r; else z = c.z2 + r;
    }
  }
  x = Math.max(-235, Math.min(235, x));
  z = Math.max(-235, Math.min(222, z));
  return { x, z };
}

export function pointInCollider(G, x, z, pad) {
  for (const c of G.colliders) {
    if (x > c.x1 - pad && x < c.x2 + pad && z > c.z1 - pad && z < c.z2 + pad) return true;
  }
  return false;
}
