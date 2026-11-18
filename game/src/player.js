// Jules Vane on foot: third-person movement, camera orbit, entering/exiting cars.
import * as THREE from '../vendor/three.module.min.js';
import { CFG, CONTROLS } from './config.js';
import { collideCircle } from './city.js';
import { addWanted } from './wanted.js';

function makePlayerMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0x2a6fb0 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.35), jacket);
  torso.position.y = 1.08; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), new THREE.MeshLambertMaterial({ color: 0xd8b08c }));
  head.position.y = 1.68; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, 1.4), new THREE.MeshLambertMaterial({ color: 0x2a2018 }));
  hair.position.y = 1.74; g.add(hair);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.75, 0.32), new THREE.MeshLambertMaterial({ color: 0x24303c }));
  legs.position.y = 0.38; g.add(legs);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), jacket);
  armL.position.set(-0.4, 1.05, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.4; g.add(armR);
  g.userData.armR = armR;
  return g;
}

export function createPlayer(G) {
  const mesh = makePlayerMesh();
  G.scene.add(mesh);
  G.player = {
    mesh, x: CFG.startPos.x, z: CFG.startPos.z, angle: 0,
    health: 100, money: CFG.startMoney, weapon: 'fists',
    car: null, moving: false, run: false, lastHurt: -99, phase: 0,
  };
  mesh.position.set(G.player.x, 0, G.player.z);
  G.camYaw = Math.PI; G.camPitch = 0.32; G.camManual = 0;
  return G.player;
}

function nearestCar(G, maxD) {
  let best = null, bd = maxD;
  const cars = [...G.traffic];
  if (G.comet) cars.push(G.comet);
  for (const c of cars) {
    const d = Math.hypot(c.x - G.player.x, c.z - G.player.z);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export function tryEnterCar(G) {
  if (G.player.car) return false;
  const car = nearestCar(G, 4.5);
  if (!car) return false;
  G.player.car = car;
  car.owned = car.owned || false;
  if (!car.owned) {
    car.owned = true;
    // Stealing a car is a crime: +1 wanted.
    addWanted(G, 1);
  }
  if (car.kind === 'traffic') {
    const i = G.traffic.indexOf(car);
    if (i >= 0) G.traffic.splice(i, 1);
  }
  G.player.mesh.visible = false;
  G.audio.ensure();
  return true;
}

export function exitCar(G) {
  const car = G.player.car;
  if (!car) return false;
  car.speed = 0;
  const px = car.x + Math.sin(car.angle + Math.PI / 2) * 2.2;
  const pz = car.z + Math.cos(car.angle + Math.PI / 2) * 2.2;
  const fixed = collideCircle(G, px, pz, 0.5);
  G.player.x = fixed.x; G.player.z = fixed.z;
  G.player.angle = car.angle;
  G.player.car = null;
  G.player.mesh.visible = true;
  G.player.mesh.position.set(G.player.x, 0, G.player.z);
  return true;
}

export function updatePlayer(G, dt) {
  const p = G.player;
  if (p.car) return; // driving.js owns movement while in a car
  const k = G.keys;
  // Camera-relative move direction (screen right is (-fz, fx) for forward (fx, fz)).
  const fx = Math.sin(G.camYaw), fz = Math.cos(G.camYaw);
  const rx = -fz, rz = fx;
  let mx = 0, mz = 0;
  if (k[CONTROLS.forward]) { mx += fx; mz += fz; }
  if (k[CONTROLS.back]) { mx -= fx; mz -= fz; }
  if (k[CONTROLS.right]) { mx += rx; mz += rz; }
  if (k[CONTROLS.left]) { mx -= rx; mz -= rz; }
  const len = Math.hypot(mx, mz);
  p.moving = len > 0.01;
  p.run = !!k[CONTROLS.run];
  if (p.moving) {
    mx /= len; mz /= len;
    const sp = p.run ? CFG.runSpeed : CFG.walkSpeed;
    const nx = p.x + mx * sp * dt, nz = p.z + mz * sp * dt;
    const fixed = collideCircle(G, nx, nz, 0.55);
    p.x = fixed.x; p.z = fixed.z;
    p.angle = Math.atan2(mx, mz);
    p.phase += dt * (p.run ? 13 : 9);
    p.mesh.position.y = Math.abs(Math.sin(p.phase)) * 0.07;
  } else {
    p.mesh.position.y = 0;
  }
  p.mesh.position.set(p.x, p.mesh.position.y, p.z);
  p.mesh.rotation.y = p.angle;
  // Slow health regen after 8 s without damage.
  if (G.time - p.lastHurt > 8 && p.health > 0 && p.health < 100) {
    p.health = Math.min(100, p.health + 2 * dt);
  }
}

// Chase camera: follows behind the player (or the car), mouse drag orbits.
export function updateCamera(G, dt) {
  const p = G.player;
  const target = p.car ? { x: p.car.x, z: p.car.z, angle: p.car.angle } : { x: p.x, z: p.z, angle: p.angle };
  G.camManual = Math.max(0, (G.camManual || 0) - dt);
  if (G.camManual <= 0) {
    // Ease the camera behind the heading.
    let diff = target.angle - G.camYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    G.camYaw += diff * Math.min(1, dt * 2.2);
  }
  const dist = p.car ? 12.5 : 8.5;
  const height = p.car ? 5.2 : 3.6;
  const cx = target.x - Math.sin(G.camYaw) * dist;
  const cz = target.z - Math.cos(G.camYaw) * dist;
  G.camera.position.set(cx, height, cz);
  G.camera.lookAt(target.x, 1.6, target.z);
}
