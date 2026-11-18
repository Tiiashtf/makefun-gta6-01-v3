// Solmar Bay — bootstrap: renderer, loop, input, screens, debug hook for playtests.
import * as THREE from '../vendor/three.module.min.js';
import { CFG } from './config.js';
import { makeRng } from './random.js';
import { createAudio } from './audio.js';
import { buildCity } from './city.js';
import { createTraffic, updateTraffic, spawnComet, spawnLimo, updateLimo } from './vehicles.js';
import { createPeds, updatePeds } from './pedestrians.js';
import { createPlayer, updatePlayer, updateCamera, tryEnterCar, exitCar } from './player.js';
import { updateDriving } from './driving.js';
import { shoot, punch, updateEnforcers, clearEnforcers, damagePlayer, spawnEnforcers } from './combat.js';
import { setWanted, updatePolice, updateWanted, clearPolice } from './wanted.js';
import { createMissions, updateMissions, startMission, restartMission } from './missions.js';
import { createHud, updateHud } from './hud.js';
import { saveGame, loadGame, clearSave, autosaveTick } from './savegame.js';
import { applyShot } from './shots.js';

const G = {
  scene: null, camera: null, renderer: null,
  keys: {}, time: 0, clockMin: 600, timeScale: 1,
  screen: 'title', wanted: 0, heatTimer: 0, bustTimer: 0,
  buildings: [], colliders: [], traffic: [], peds: [], police: [], enforcers: [],
  comet: null, limo: null, player: null, mission: { index: 0, stage: 'go' },
  camYaw: Math.PI, camPitch: 0.32, camManual: 0, shake: 0,
  banner: '', bannerTimer: 0, hurtFlash: 0, hitMark: 0, noReinforce: false,
  errors: [], rng: makeRng(CFG.seed), audio: createAudio(), dusk: false,
  nearCar: null, saveTimer: 0, lastSaveAt: 0, sun: null, hemi: null,
};

window.addEventListener('error', (e) => { G.errors.push(String(e.message || e.error || 'error')); });

function resetWorld() {
  clearEnforcers(G);
  clearPolice(G);
  G.wanted = 0; G.heatTimer = 0; G.bustTimer = 0; G.noReinforce = false; G.getawaySpawned = false;
  G.mission = { index: 0, stage: 'go' };
  const p = G.player;
  if (p.car) { p.car.speed = 0; p.car = null; }
  p.x = CFG.startPos.x; p.z = CFG.startPos.z; p.angle = 0;
  p.health = 100; p.money = CFG.startMoney; p.weapon = 'fists';
  p.mesh.visible = true;
  p.mesh.position.set(p.x, 0, p.z);
  const c = G.comet;
  c.x = 84; c.z = 112; c.angle = Math.PI; c.speed = 0; c.owned = false;
  c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.angle;
  const limo = G.limo;
  limo.active = false; limo.rams = 0; limo.ramCooldown = 0;
  limo.x = 0; limo.z = -104; limo.angle = Math.PI / 2;
  limo.mesh.position.set(limo.x, 0, limo.z); limo.mesh.rotation.y = limo.angle;
  G.clockMin = 600; G.time = 0; G.saveTimer = 0; G.dusk = false;
  if (G.sun) { G.sun.color.setHex(0xfff2d8); G.sun.intensity = 1.6; }
  if (G.hemi) G.hemi.intensity = 0.9;
  clearSave();
}

G.ui = {
  newGame() {
    resetWorld();
    G.screen = 'playing';
    G.audio.ensure();
    G.banner = 'Mission: Welcome Home — walk to Mara\u2019s Garage';
    G.bannerTimer = 4;
  },
  continueGame() {
    const d = loadGame();
    if (!d) { G.ui.newGame(); return; }
    resetWorld();
    G.player.money = d.money; G.player.health = d.health;
    G.player.x = d.x; G.player.z = d.z;
    G.player.mesh.position.set(d.x, 0, d.z);
    G.clockMin = d.clockMin || 600;
    // A completed story loads as free roam, not as mission 6 again.
    if ((d.mission || 0) >= 6) G.mission = { index: 6, stage: 'done' };
    else startMission(G, d.mission || 0);
    if (d.wanted) setWanted(G, d.wanted);
    G.screen = 'playing';
    G.audio.ensure();
  },
  resume() { if (G.screen === 'paused') G.screen = 'playing'; },
  respawn() {
    const p = G.player;
    if (p.car) { p.car.speed = 0; p.car = null; }
    p.x = CFG.respawn.x; p.z = CFG.respawn.z; p.health = 100;
    p.mesh.visible = true;
    p.mesh.position.set(p.x, 0, p.z);
    setWanted(G, 0); clearPolice(G);
    restartMission(G);
    G.screen = 'playing';
  },
  payBail() {
    G.ui.respawn();
  },
  keepPlaying() {
    // Story done: stay in free roam, don't restart.
    G.screen = 'playing';
  },
};

function init() {
  const canvas = document.getElementById('game-canvas');
  G.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  G.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  G.renderer.setSize(window.innerWidth, window.innerHeight);
  G.scene = new THREE.Scene();
  G.scene.background = new THREE.Color(0x87b5e0);
  G.scene.fog = new THREE.Fog(0x87b5e0, 220, 520);
  G.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 900);
  G.hemi = new THREE.HemisphereLight(0xbfd9ff, 0x6a5a44, 0.9);
  G.scene.add(G.hemi);
  G.sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
  G.sun.position.set(120, 180, 60);
  G.scene.add(G.sun);
  buildCity(G);
  createTraffic(G);
  spawnComet(G);
  spawnLimo(G);
  createPeds(G);
  createPlayer(G);
  createMissions(G);
  createHud(G);
  // Continue button only when a save exists.
  G.hud.btnContinue.style.display = loadGame() ? 'inline-block' : 'none';
  if (loadGame()) {
    const d = loadGame();
    G.hud.saveInfo.textContent = 'Save: mission ' + (d.mission + 1) + '/6 · $' + d.money;
  }
  window.addEventListener('resize', () => {
    G.camera.aspect = window.innerWidth / window.innerHeight;
    G.camera.updateProjectionMatrix();
    G.renderer.setSize(window.innerWidth, window.innerHeight);
  });
  bindInput(canvas);
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) {
    G.ui.newGame();
    setTimeout(() => applyShot(G, shot), 300);
  }
  const clock = new THREE.Clock();
  G.renderer.setAnimationLoop(() => {
    const rawDt = Math.min(clock.getDelta(), 0.05);
    const dt = rawDt * (G.timeScale || 1);
    tick(dt, rawDt);
  });
}

function tick(dt, rawDt) {
  if (G.screen === 'playing') {
    G.time += dt;
    G.clockMin += dt * 0.55;
    updatePlayer(G, dt);
    updateDriving(G, dt);
    updateTraffic(G, dt);
    updatePeds(G, dt);
    updateEnforcers(G, dt);
    updatePolice(G, dt);
    updateWanted(G, dt);
    updateMissions(G, dt);
    updateLimo(G, dt);
    autosaveTick(G, dt);
    // Nearest car for the enter prompt.
    G.nearCar = null;
    if (!G.player.car) {
      let bd = 4.5;
      for (const c of [...G.traffic, G.comet]) {
        const d = Math.hypot(c.x - G.player.x, c.z - G.player.z);
        if (d < bd) { bd = d; G.nearCar = c; }
      }
    }
  }
  updateCamera(G, rawDt);
  if (G.shake > 0) {
    G.shake = Math.max(0, G.shake - rawDt * 1.8);
    G.camera.position.x += (Math.random() - 0.5) * G.shake * 0.5;
    G.camera.position.y += (Math.random() - 0.5) * G.shake * 0.4;
  }
  updateHud(G, rawDt);
  G.renderer.render(G.scene, G.camera);
}

function handleAction(code) {
  if (code === 'KeyE') {
    if (G.screen !== 'playing') return;
    if (G.player.car) exitCar(G); else tryEnterCar(G);
  } else if (code === 'KeyQ') {
    if (G.screen !== 'playing') return;
    G.player.weapon = G.player.weapon === 'pistol' ? 'fists' : 'pistol';
  } else if (code === 'KeyR') {
    if (G.screen === 'playing') restartMission(G);
  } else if (code === 'KeyM') {
    G.audio.setMuted(!G.audio.muted);
  } else if (code === 'Escape') {
    if (G.screen === 'playing') G.screen = 'paused';
    else if (G.screen === 'paused') G.screen = 'playing';
  }
}

function bindInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (!e.repeat) handleAction(e.code);
    G.keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => { G.keys[e.code] = false; });
  let dragging = false, lx = 0, ly = 0, moved = 0;
  canvas.addEventListener('mousedown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; moved = 0; G.audio.ensure(); });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    G.camYaw -= dx * 0.005;
    G.camPitch = Math.max(0.1, Math.min(1.1, G.camPitch + dy * 0.003));
    G.camManual = 2.5;
  });
  window.addEventListener('mouseup', () => {
    if (dragging && moved < 6 && G.screen === 'playing') {
      if (G.player.weapon === 'pistol') shoot(G); else punch(G);
    }
    dragging = false;
  });
}

// Debug hook for the playtest driver: drives the real game code paths.
window.__game = {
  state() {
    const p = G.player;
    // Effective position: the car when driving, the feet when on foot.
    const ex = p.car ? p.car.x : p.x, ez = p.car ? p.car.z : p.z;
    return {
      screen: G.screen, mission: { ...G.mission }, wanted: G.wanted,
      health: Math.round(p.health), money: Math.floor(p.money), weapon: p.weapon,
      player: { x: +ex.toFixed(1), z: +ez.toFixed(1), angle: +p.angle.toFixed(2), inCar: !!p.car, carSpeed: p.car ? +p.car.speed.toFixed(1) : 0 },
      comet: G.comet ? { x: +G.comet.x.toFixed(1), z: +G.comet.z.toFixed(1), owned: G.comet.owned } : null,
      limo: G.limo ? { x: +G.limo.x.toFixed(1), z: +G.limo.z.toFixed(1), active: G.limo.active, rams: G.limo.rams, angle: +G.limo.angle.toFixed(2) } : null,
      enforcers: (G.enforcers || []).length, police: (G.police || []).length,
      enfPos: (G.enforcers || []).slice(0, 5).map((e) => [+e.x.toFixed(1), +e.z.toFixed(1), Math.ceil(e.health)]),
      policePos: (G.police || []).slice(0, 5).map((c) => [+c.x.toFixed(1), +c.z.toFixed(1), c.state]),
      buildings: G.buildings.length, traffic: G.traffic.length, peds: G.peds.length,
      landmarkNames: G.buildings.filter((b) => b.name).map((b) => b.name),
      trafficPos: G.traffic.slice(0, 3).map((c) => [+c.x.toFixed(1), +c.z.toFixed(1)]),
      pedPos: G.peds.slice(0, 3).map((q) => [+q.x.toFixed(1), +q.z.toFixed(1)]),
      muted: G.audio.muted,
      clockMin: Math.floor(G.clockMin), errors: [...G.errors], time: +G.time.toFixed(2),
      bustTimer: +(G.bustTimer || 0).toFixed(2), saveExists: !!loadGame(),
    };
  },
  newGame: () => G.ui.newGame(),
  respawn: () => G.ui.respawn(),
  payBail: () => G.ui.payBail(),
  teleport(x, z) {
    const p = G.player;
    if (p.car) { p.car.x = x; p.car.z = z; p.car.speed = 0; p.car.mesh.position.set(x, 0, z); }
    else { p.x = x; p.z = z; p.mesh.position.set(x, 0, z); }
  },
  teleportCar(x, z) { if (G.player.car) { G.player.car.x = x; G.player.car.z = z; G.player.car.speed = 0; } },
  setMission(i) { startMission(G, i); },
  setWanted(n) { setWanted(G, n); },
  setHealth(n) { G.player.health = n; },
  setMoney(n) { G.player.money = n; },
  giveWeapon(w) { G.player.weapon = w; },
  enterCar: () => tryEnterCar(G),
  exitCar: () => exitCar(G),
  shoot: () => shoot(G),
  punch: () => punch(G),
  hurt: (n) => damagePlayer(G, n),
  spawnEnforcer(x, z) { spawnEnforcers(G, x, z, 1, 'test'); },
  nearestTraffic() {
    let best = null, bd = 1e9;
    for (const c of G.traffic) {
      const d = Math.hypot(c.x - G.player.x, c.z - G.player.z);
      if (d < bd) { bd = d; best = c; }
    }
    return best ? { x: +best.x.toFixed(1), z: +best.z.toFixed(1), d: +bd.toFixed(1) } : null;
  },
  setCamYaw(y) { G.camYaw = y; G.camManual = 3; },
  setCarAngle(a) { if (G.player.car) { G.player.car.angle = a; G.player.car.mesh.rotation.y = a; } },
  aimAtEnforcer(i) {
    const e = (G.enforcers || [])[i || 0];
    if (!e) return false;
    const p = G.player;
    const px = p.car ? p.car.x : p.x, pz = p.car ? p.car.z : p.z;
    G.camYaw = Math.atan2(e.x - px, e.z - pz);
    G.camManual = 2;
    // Point the camera at the enforcer so the hitscan ray meets it.
    G.camera.position.set(px - Math.sin(G.camYaw) * 8, 3.2, pz - Math.cos(G.camYaw) * 8);
    G.camera.lookAt(e.x, 1.2, e.z);
    return true;
  },
  key(code, down) {
    if (down) { if (!G.keys[code]) handleAction(code); G.keys[code] = true; }
    else G.keys[code] = false;
  },
  setTimeScale(s) { G.timeScale = s; },
  save: () => saveGame(G),
  errors: () => [...G.errors],
};

init();
