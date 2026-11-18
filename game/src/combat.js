// Combat: fists and pistol, enforcer AI that shoots back, damage and death.
import * as THREE from '../vendor/three.module.min.js';
import { collideCircle } from './city.js';

function makeEnforcerMesh() {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.36), new THREE.MeshLambertMaterial({ color: 0x1a1a20 }));
  torso.position.y = 1.08; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshLambertMaterial({ color: 0xc8a080 }));
  head.position.y = 1.66; g.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.75, 0.32), new THREE.MeshLambertMaterial({ color: 0x14141a }));
  legs.position.y = 0.38; g.add(legs);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.55), new THREE.MeshLambertMaterial({ color: 0x0a0a0a }));
  gun.position.set(0.3, 1.15, 0.3); g.add(gun);
  return g;
}

export function spawnEnforcers(G, x, z, n, tag) {
  if (!G.enforcers) G.enforcers = [];
  for (let i = 0; i < n; i++) {
    const mesh = makeEnforcerMesh();
    G.scene.add(mesh);
    const ex = x + (G.rng.next() - 0.5) * 18;
    const ez = z + (G.rng.next() - 0.5) * 18;
    const e = { mesh, x: ex, z: ez, health: 100, shootTimer: 0.8 + G.rng.next() * 0.8, tag, angle: 0 };
    mesh.position.set(ex, 0, ez);
    G.enforcers.push(e);
  }
}

export function clearEnforcers(G, tag) {
  if (!G.enforcers) return;
  G.enforcers = G.enforcers.filter((e) => {
    if (tag && e.tag !== tag) return true;
    G.scene.remove(e.mesh);
    return false;
  });
}

export function enforcersAlive(G, tag) {
  if (!G.enforcers) return 0;
  return G.enforcers.filter((e) => !tag || e.tag === tag).length;
}

export function damagePlayer(G, dmg) {
  const p = G.player;
  if (p.health <= 0 || G.screen !== 'playing') return;
  p.health -= dmg;
  p.lastHurt = G.time;
  G.hurtFlash = 0.6;
  if (p.health <= 0) {
    p.health = 0;
    p.money = Math.floor(p.money / 2);
    G.audio.fail();
    G.screen = 'wasted';
    G.audio.siren(false);
    G.audio.engine(0, false);
  }
}

export function updateEnforcers(G, dt) {
  if (!G.enforcers) return;
  const p = G.player;
  const px = p.car ? p.car.x : p.x, pz = p.car ? p.car.z : p.z;
  for (const e of G.enforcers) {
    const dx = px - e.x, dz = pz - e.z;
    const d = Math.hypot(dx, dz);
    e.angle = Math.atan2(dx, dz);
    e.mesh.rotation.y = e.angle;
    if (d < 30 && d > 2) {
      const nx = e.x + (dx / d) * 3.2 * dt, nz = e.z + (dz / d) * 3.2 * dt;
      const fixed = collideCircle(G, nx, nz, 0.55);
      e.x = fixed.x; e.z = fixed.z;
      e.mesh.position.set(e.x, 0, e.z);
    }
    if (d < 45 && G.screen === 'playing') {
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = 1.5 + G.rng.next() * 0.6;
        if (G.rng.next() < 0.35) {
          damagePlayer(G, 8);
          G.audio.shot();
        }
      }
    }
  }
}

// Hitscan pistol shot from the player along the camera's facing (horizontal),
// so the third-person camera's downward tilt never throws the aim off.
export function shoot(G) {
  const p = G.player;
  if (p.weapon !== 'pistol' || G.screen !== 'playing') return false;
  G.audio.shot();
  G.audio.ensure();
  const px = p.car ? p.car.x : p.x, pz = p.car ? p.car.z : p.z;
  const dirX = Math.sin(G.camYaw), dirZ = Math.cos(G.camYaw);
  let best = null, bestD = 70;
  for (const e of G.enforcers || []) {
    const dx = e.x - px, dz = e.z - pz;
    const d = Math.hypot(dx, dz);
    if (d > 70 || d < 0.5) continue;
    const dot = (dx * dirX + dz * dirZ) / d;
    if (dot > 0.9985 && d < bestD) { best = e; bestD = d; }
  }
  if (best) {
    best.health -= 34;
    G.hitMark = 0.4;
    if (best.health <= 0) {
      G.scene.remove(best.mesh);
      G.enforcers = G.enforcers.filter((e) => e !== best);
    }
    return true;
  }
  return false;
}

export function punch(G) {
  const p = G.player;
  if (p.weapon !== 'fists' || G.screen !== 'playing') return false;
  G.audio.punch();
  const px = p.car ? p.car.x : p.x, pz = p.car ? p.car.z : p.z;
  // Punch toward the camera facing (where the player is looking).
  const pa = G.camYaw;
  for (const e of [...(G.enforcers || [])]) {
    const dx = e.x - px, dz = e.z - pz;
    const d = Math.hypot(dx, dz);
    if (d > 3.0) continue;
    const dot = (dx * Math.sin(pa) + dz * Math.cos(pa)) / (d || 1);
    if (dot < 0.2) continue;
    e.health -= 25;
    if (e.health <= 0) {
      G.scene.remove(e.mesh);
      G.enforcers = G.enforcers.filter((x) => x !== e);
    }
    return true;
  }
  return false;
}
