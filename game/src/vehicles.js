// Cars: traffic (16 loop drivers), the Comet GT, Kaine's limo.
import * as THREE from '../vendor/three.module.min.js';
import { CFG, LANDMARKS } from './config.js';
import { makeRng } from './random.js';

export function makeCarMesh(color, opts = {}) {
  const g = new THREE.Group();
  const len = opts.length || 4.2, wid = opts.width || 1.9, hgt = opts.height || 1.35;
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(wid, hgt * 0.55, len), bodyMat);
  body.position.y = 0.55; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.8, hgt * 0.5, len * 0.45), new THREE.MeshLambertMaterial({ color: 0x1c2733 }));
  cabin.position.set(0, hgt * 0.8, -len * 0.05); g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheels = [];
  for (const [wx, wz] of [[-wid / 2, len * 0.32], [wid / 2, len * 0.32], [-wid / 2, -len * 0.32], [wid / 2, -len * 0.32]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.36, wz); g.add(w); wheels.push(w);
  }
  if (opts.lightBar) {
    const lb = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.7, 0.22, 0.5), new THREE.MeshLambertMaterial({ color: 0x223344, emissive: 0x2244ff }));
    lb.position.set(0, hgt * 1.1, 0); g.add(lb);
  }
  if (opts.stripe) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(wid * 1.01, 0.3, len * 0.98), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    st.position.y = 0.62; g.add(st);
  }
  return { group: g, wheels };
}

function newCar(G, color, opts) {
  const m = makeCarMesh(color, opts);
  G.scene.add(m.group);
  return { mesh: m.group, wheels: m.wheels, x: 0, z: 0, angle: 0, speed: 0, color, kind: opts.kind || 'traffic', owned: false, leg: 0, loop: null, baseSpeed: 8 };
}

// Traffic drives rectangular loops around blocks, always on roads.
export function createTraffic(G) {
  const rng = makeRng(CFG.seed + 77);
  G.traffic = [];
  const colors = [0xc0c0c0, 0x3a6fb0, 0xb03a3a, 0x3a9a5a, 0xd8c23a, 0x7a4a9a, 0xe0e0e0, 0x303030];
  for (let i = 0; i < CFG.trafficCount; i++) {
    const car = newCar(G, rng.pick(colors), { kind: 'traffic' });
    const bx = rng.pick(CFG.blockCenters), bz = rng.pick(CFG.blockCenters);
    car.loop = { cx: bx, cz: bz };
    car.leg = rng.int(0, 3);
    car.baseSpeed = rng.range(8, 12);
    car.speed = car.baseSpeed;
    car.lane = rng.chance(0.5) ? 3.5 : -3.5;
    // Place on the current leg.
    const L = car.lane, cx = bx, cz = bz;
    if (car.leg === 0) { car.x = cx - 28; car.z = cz - 28 + L; car.angle = Math.PI / 2; }
    if (car.leg === 1) { car.x = cx + 28 - L; car.z = cz - 28; car.angle = 0; }
    if (car.leg === 2) { car.x = cx + 28; car.z = cz + 28 - L; car.angle = -Math.PI / 2; }
    if (car.leg === 3) { car.x = cx - 28 + L; car.z = cz + 28; car.angle = Math.PI; }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;
    G.traffic.push(car);
  }
}

export function updateTraffic(G, dt) {
  for (const car of G.traffic) {
    // Slow down if the player's car is right ahead.
    let target = car.baseSpeed;
    if (G.player.car) {
      const dx = G.player.car.x - car.x, dz = G.player.car.z - car.z;
      if (dx * dx + dz * dz < 36) target = 0;
    }
    car.speed += (target - car.speed) * Math.min(1, dt * 2);
    const { cx, cz } = car.loop, L = car.lane;
    const step = car.speed * dt;
    if (car.leg === 0) { car.x += step; car.angle = Math.PI / 2; if (car.x >= cx + 28) { car.leg = 1; car.x = cx + 28 - L; } }
    else if (car.leg === 1) { car.z += step; car.angle = 0; if (car.z >= cz + 28) { car.leg = 2; car.z = cz + 28 - L; } }
    else if (car.leg === 2) { car.x -= step; car.angle = -Math.PI / 2; if (car.x <= cx - 28) { car.leg = 3; car.x = cx - 28 + L; } }
    else { car.z -= step; car.angle = Math.PI; if (car.z <= cz - 28) { car.leg = 0; car.z = cz - 28 + L; } }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;
    for (const w of car.wheels) w.rotation.x += car.speed * dt * 2;
  }
}

export function spawnComet(G) {
  const car = newCar(G, 0xd8382a, { kind: 'comet', length: 4.4, width: 2.0, height: 1.15 });
  car.x = LANDMARKS.cometParked.x; car.z = LANDMARKS.cometParked.z; car.angle = LANDMARKS.cometParked.angle;
  car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.angle;
  G.comet = car;
  return car;
}

// Kaine's black limo: parked on the avenue, inert (no collision) until mission 6.
export function spawnLimo(G) {
  const car = newCar(G, 0x0d0d12, { kind: 'limo', length: 7.2, width: 2.1, height: 1.5 });
  car.x = LANDMARKS.limoStart.x; car.z = LANDMARKS.limoStart.z; car.angle = LANDMARKS.limoStart.angle;
  car.active = false; car.rams = 0; car.ramCooldown = 0; car.dir = 1;
  car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.angle;
  G.limo = car;
  return car;
}

export function updateLimo(G, dt) {
  const limo = G.limo;
  if (!limo || !limo.active) return;
  limo.ramCooldown = Math.max(0, limo.ramCooldown - dt);
  limo.speed = 13;
  limo.x += Math.sin(limo.angle) * limo.speed * dt;
  limo.z += Math.cos(limo.angle) * limo.speed * dt;
  if (limo.x > 200) { limo.angle = -Math.PI / 2; }
  if (limo.x < -200) { limo.angle = Math.PI / 2; }
  limo.mesh.position.set(limo.x, 0, limo.z);
  limo.mesh.rotation.y = limo.angle;
  for (const w of limo.wheels) w.rotation.x += limo.speed * dt * 2;
}
