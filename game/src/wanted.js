// Wanted 0-5: police chase/ram/bust, losing the trail, heat decay, Paint & Spray.
import * as THREE from '../vendor/three.module.min.js';
import { CFG, LANDMARKS } from './config.js';
import { collideCircle } from './city.js';
import { makeCarMesh } from './vehicles.js';

export function addWanted(G, n) {
  setWanted(G, Math.min(5, (G.wanted || 0) + n));
}

export function setWanted(G, n) {
  G.wanted = Math.max(0, Math.min(5, n));
  G.heatTimer = 0;
  syncPolice(G);
  G.audio.siren(G.wanted > 0);
}

function spawnPoliceCar(G) {
  const m = makeCarMesh(0xf0f0f0, { kind: 'police', lightBar: true, stripe: true });
  G.scene.add(m.group);
  const p = G.player;
  const bx = p.car ? p.car.x : p.x, bz = p.car ? p.car.z : p.z;
  const a = G.rng.next() * Math.PI * 2;
  const pos = collideCircle(G, bx + Math.sin(a) * 26, bz + Math.cos(a) * 26, 2);
  const car = { mesh: m.group, wheels: m.wheels, x: pos.x, z: pos.z, angle: 0, speed: 0, kind: 'police', state: 'chase', lostTimer: 0, giveupTimer: 0 };
  car.mesh.position.set(car.x, 0, car.z);
  G.police.push(car);
  return car;
}

export function syncPolice(G) {
  if (!G.police) G.police = [];
  // No reinforcements during a getaway: spawn the initial wave once, never add more.
  if (G.noReinforce) {
    if (!G.getawaySpawned && G.wanted > 0) {
      while (G.police.length < G.wanted) spawnPoliceCar(G);
      G.getawaySpawned = true;
    }
    while (G.police.length > G.wanted) removePolice(G, G.police[G.police.length - 1]);
    return;
  }
  while (G.police.length < G.wanted) spawnPoliceCar(G);
  while (G.police.length > G.wanted) removePolice(G, G.police[G.police.length - 1]);
  G.audio.siren(G.wanted > 0);
}

function removePolice(G, car) {
  const i = G.police.indexOf(car);
  if (i >= 0) G.police.splice(i, 1);
  G.scene.remove(car.mesh);
}

export function clearPolice(G) {
  if (!G.police) return;
  for (const c of [...G.police]) removePolice(G, c);
  G.audio.siren(false);
}

export function updatePolice(G, dt) {
  if (!G.police) return;
  const p = G.player;
  const px = p.car ? p.car.x : p.x, pz = p.car ? p.car.z : p.z;
  const playerSpeed = p.car ? Math.abs(p.car.speed) : 0;
  for (const car of [...G.police]) {
    const dx = px - car.x, dz = pz - car.z;
    const d = Math.hypot(dx, dz);
    if (car.state === 'giveup') {
      car.giveupTimer += dt;
      car.speed = Math.max(0, car.speed - 6 * dt);
      if (car.giveupTimer > 5) { removePolice(G, car); continue; }
    } else {
      // Lose the trail: >50 m away for 3 s.
      if (d > CFG.lostDistance) car.lostTimer += dt; else car.lostTimer = 0;
      if (car.lostTimer > CFG.lostTime) { car.state = 'giveup'; car.giveupTimer = 0; continue; }
      const desired = Math.atan2(dx, dz);
      let diff = desired - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
      // Ease in and stop alongside the player: a cruiser that just blasts past
      // can never hold him for the 2.5 s bust. Stop ~2.5 m away.
      let target = CFG.policeSpeed + G.wanted * 1.2;
      if (d < 8) target = Math.min(target, Math.max(0, (d - 2.5) * 3));
      if (d < 3.0) target = 0;
      // Brake hard when the target drops below current speed: a cruiser that
      // eases off slowly overshoots the player by 30 m and can never hold him.
      if (target < car.speed) car.speed = Math.max(target, car.speed - 30 * dt);
      else car.speed += (target - car.speed) * Math.min(1, dt * 1.2);
    }
    const nx = car.x + Math.sin(car.angle) * car.speed * dt;
    const nz = car.z + Math.cos(car.angle) * car.speed * dt;
    const fixed = collideCircle(G, nx, nz, 1.9);
    if (fixed.x !== nx || fixed.z !== nz) car.speed *= 0.6;
    car.x = fixed.x; car.z = fixed.z;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;
    for (const w of car.wheels) w.rotation.x += car.speed * dt * 2;

    // Ram: shove the player's car, but only when it is slow (<12 m/s).
    if (car.state === 'chase' && p.car && d < 3.6) {
      if (playerSpeed < 12) {
        const push = 3.6 - d;
        p.car.x -= (dx / (d || 1)) * push * 0.5;
        p.car.z -= (dz / (d || 1)) * push * 0.5;
        p.car.speed *= 0.75;
        G.shake = Math.max(G.shake || 0, 0.35);
      } else {
        car.speed *= 0.85;
      }
    }
  }
  // Bust: a cruiser holding the player for 2.5 s.
  let near = false;
  for (const car of G.police) {
    const d = Math.hypot(px - car.x, pz - car.z);
    if (car.state === 'chase' && d < 3.2 && (!p.car || playerSpeed < 2)) near = true;
  }
  if (near && G.screen === 'playing') {
    G.bustTimer = (G.bustTimer || 0) + dt;
    if (G.bustTimer >= CFG.bustHold) {
      G.bustTimer = 0;
      G.bail = Math.min(200, p.money);
      p.money -= G.bail;
      setWanted(G, 0);
      clearPolice(G);
      G.screen = 'busted';
      G.audio.fail();
      G.audio.engine(0, false);
    }
  } else {
    G.bustTimer = Math.max(0, (G.bustTimer || 0) - dt * 2);
  }
}

// Heat decay: with no cruiser actively chasing, lose one star per 15 s.
export function updateWanted(G, dt) {
  const chasing = (G.police || []).some((c) => c.state === 'chase');
  if (G.wanted > 0 && !chasing) {
    G.heatTimer = (G.heatTimer || 0) + dt;
    if (G.heatTimer >= CFG.decayPerStar) {
      G.heatTimer = 0;
      setWanted(G, G.wanted - 1);
    }
  } else if (chasing) {
    G.heatTimer = 0;
  }
  // Paint & Spray: driving inside the zone clears wanted for $150.
  if (G.wanted > 0 && pInCar(G)) {
    const car = G.player.car;
    const d = Math.hypot(car.x - LANDMARKS.paint.x, car.z - LANDMARKS.paint.z);
    if (d < CFG.paintRadius && G.player.money >= CFG.paintCost) {
      G.player.money -= CFG.paintCost;
      setWanted(G, 0);
      clearPolice(G);
      G.banner = 'Paint & Spray: clean getaway, -$150';
      G.bannerTimer = 3;
    }
  }
}

function pInCar(G) { return !!G.player.car; }
