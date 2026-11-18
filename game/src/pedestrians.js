// Pedestrians (26) strolling the sidewalks on seeded routes.
import * as THREE from '../vendor/three.module.min.js';
import { CFG } from './config.js';
import { makeRng } from './random.js';
import { collideCircle } from './city.js';

const SHIRTS = [0xd84a4a, 0x4a7ad8, 0x4ad87a, 0xd8c24a, 0x9a4ad8, 0xe0e0e0, 0x4ad8c2, 0xd87a4a];

function makePedMesh(color) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), new THREE.MeshLambertMaterial({ color }));
  torso.position.y = 1.05; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd8b08c }));
  head.position.y = 1.62; g.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), new THREE.MeshLambertMaterial({ color: 0x2e3440 }));
  legs.position.y = 0.35; g.add(legs);
  return g;
}

function randomSidewalkTarget(rng) {
  const s = rng.pick(CFG.streetLines);
  const v = rng.range(-196, 196);
  const off = rng.chance(0.5) ? 10.5 : -10.5;
  if (rng.chance(0.5)) return { x: s + off, z: v };
  return { x: v, z: s + off };
}

export function createPeds(G) {
  const rng = makeRng(CFG.seed + 31);
  G.peds = [];
  for (let i = 0; i < CFG.pedCount; i++) {
    const mesh = makePedMesh(rng.pick(SHIRTS));
    G.scene.add(mesh);
    const t = randomSidewalkTarget(rng);
    const p = { mesh, x: t.x, z: t.z, tx: t.x, tz: t.z, speed: rng.range(1.2, 2.0), phase: rng.range(0, 6), angle: 0 };
    p.tx = t.x; p.tz = t.z;
    const t2 = randomSidewalkTarget(rng); p.tx = t2.x; p.tz = t2.z;
    mesh.position.set(p.x, 0, p.z);
    G.peds.push(p);
  }
}

export function updatePeds(G, dt) {
  const rng = G.pedRng || (G.pedRng = makeRng(CFG.seed + 55));
  for (const p of G.peds) {
    const dx = p.tx - p.x, dz = p.tz - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.2) {
      const t = randomSidewalkTarget(rng); p.tx = t.x; p.tz = t.z;
      continue;
    }
    p.angle = Math.atan2(dx, dz);
    const step = p.speed * dt;
    const nx = p.x + (dx / d) * step, nz = p.z + (dz / d) * step;
    const fixed = collideCircle(G, nx, nz, 0.5);
    p.x = fixed.x; p.z = fixed.z;
    p.phase += dt * 8;
    p.mesh.position.set(p.x, Math.abs(Math.sin(p.phase)) * 0.06, p.z);
    p.mesh.rotation.y = p.angle;
  }
}
