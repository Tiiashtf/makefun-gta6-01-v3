// Arcade driving: acceleration, steering, handbrake, collisions, car theft hooks.
import { CFG } from './config.js';
import { collideCircle } from './city.js';

export function updateDriving(G, dt) {
  const p = G.player;
  const car = p.car;
  if (!car) return;
  const k = G.keys;
  const forward = Math.sin(car.angle), fz = Math.cos(car.angle);
  if (k['KeyW'] || k['ArrowUp']) car.speed += CFG.carAccel * dt;
  else if (k['KeyS'] || k['ArrowDown']) {
    if (car.speed > 0.5) car.speed -= CFG.carBrake * dt;
    else car.speed -= CFG.carAccel * 0.6 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  }
  const handbrake = !!k['Space'];
  if (handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 26 * dt);
  car.speed = Math.max(-CFG.carReverse, Math.min(CFG.carTopSpeed, car.speed));
  // Steering: sharper at low speed, looser at top speed; handbrake sharpens it.
  const steerInput = (k['KeyA'] || k['ArrowLeft'] ? -1 : 0) + (k['KeyD'] || k['ArrowRight'] ? 1 : 0);
  const grip = handbrake ? 2.1 : 1;
  const steerRate = 1.9 * grip * Math.min(1, Math.abs(car.speed) / 8 + 0.25) * (car.speed < 0 ? -1 : 1);
  car.angle += steerInput * steerRate * dt * Math.min(1, Math.abs(car.speed) / 6 + 0.15);
  const nx = car.x + Math.sin(car.angle) * car.speed * dt;
  const nz = car.z + Math.cos(car.angle) * car.speed * dt;
  const before = { x: car.x, z: car.z };
  const fixed = collideCircle(G, nx, nz, 1.9);
  car.x = fixed.x; car.z = fixed.z;
  const hitWall = Math.hypot(car.x - before.x - Math.sin(car.angle) * car.speed * dt, car.z - before.z - Math.cos(car.angle) * car.speed * dt) > 0.01;
  if (hitWall || (fixed.x !== nx || fixed.z !== nz)) car.speed *= 0.45;

  // Bump traffic cars.
  for (const t of G.traffic) {
    const dx = t.x - car.x, dz = t.z - car.z;
    const d = Math.hypot(dx, dz);
    if (d < 3.6 && d > 0.01) {
      const push = (3.6 - d) / 2;
      car.x -= (dx / d) * push; car.z -= (dz / d) * push;
      car.speed *= 0.7;
    }
  }
  // The limo only collides once mission 6 starts; rams count with a cooldown.
  const limo = G.limo;
  if (limo && limo.active) {
    const dx = limo.x - car.x, dz = limo.z - car.z;
    const d = Math.hypot(dx, dz);
    if (d < 4.2 && d > 0.01) {
      if (limo.ramCooldown <= 0 && Math.abs(car.speed) > 4) {
        limo.rams += 1;
        limo.ramCooldown = 1.2;
        G.audio.punch();
        G.shake = 0.5;
      }
      const push = (4.2 - d) / 2;
      car.x -= (dx / d) * push; car.z -= (dz / d) * push;
      car.speed *= 0.55;
      limo.x += (dx / d) * push * 0.4; limo.z += (dz / d) * push * 0.4;
    }
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.angle;
  for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.2;
  // Engine sound follows speed.
  G.audio.engine(Math.abs(car.speed) / CFG.carTopSpeed, true);
  void forward; void fz;
}

export function carSpeedKmh(G) {
  const car = G.player.car;
  return car ? Math.round(Math.abs(car.speed) * 3.6) : 0;
}
