// HUD: health, money, weapon, wanted stars, clock, speed, crosshair, prompts,
// objective banner, 220 px live minimap, and the title/pause/wasted/busted/complete screens.
import { CFG } from './config.js';
import { missionName, missionObjective, missionWaypoint } from './missions.js';
import { carSpeedKmh } from './driving.js';

export function createHud(G) {
  const $ = (id) => document.getElementById(id);
  G.hud = {
    healthFill: $('health-fill'), healthText: $('health-text'), money: $('money'),
    weapon: $('weapon'), stars: $('stars'), clock: $('clock'), speed: $('speed'),
    objective: $('objective'), prompt: $('prompt'), banner: $('banner'),
    minimap: $('minimap'), crosshair: $('crosshair'), hurt: $('hurt'),
    screens: { title: $('screen-title'), pause: $('screen-pause'), wasted: $('screen-wasted'), busted: $('screen-busted'), complete: $('screen-complete') },
    btnNew: $('btn-new'), btnContinue: $('btn-continue'), btnResume: $('btn-resume'),
    btnRespawn: $('btn-respawn'), btnBail: $('btn-bail'), btnAgain: $('btn-again'),
    saveInfo: $('save-info'), bailText: $('bail-text'), wastedText: $('wasted-text'),
    mmCtx: $('minimap').getContext('2d'),
  };
  const H = G.hud;
  H.btnNew.addEventListener('click', () => G.ui.newGame());
  H.btnContinue.addEventListener('click', () => G.ui.continueGame());
  H.btnResume.addEventListener('click', () => G.ui.resume());
  H.btnRespawn.addEventListener('click', () => G.ui.respawn());
  H.btnBail.addEventListener('click', () => G.ui.payBail());
  H.btnAgain.addEventListener('click', () => G.ui.keepPlaying());
}

export function showScreens(G) {
  const H = G.hud;
  for (const [name, el] of Object.entries(H.screens)) {
    el.style.display = (G.screen === name) ? 'flex' : 'none';
  }
  document.getElementById('hud').style.display = (G.screen === 'playing' || G.screen === 'paused') ? 'block' : 'none';
}

function drawMinimap(G) {
  const ctx = G.hud.mmCtx;
  const S = 220, k = S / 480, ox = S / 2, oz = S / 2;
  const X = (x) => ox + x * k, Z = (z) => oz + z * k;
  ctx.fillStyle = '#20301f'; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#2e6f9e'; ctx.fillRect(0, Z(203), S, S - Z(203));
  ctx.fillStyle = '#dcc48f'; ctx.fillRect(0, Z(196), S, Z(203) - Z(196));
  ctx.strokeStyle = '#565b63'; ctx.lineWidth = 6;
  for (const s of CFG.streetLines) {
    ctx.beginPath(); ctx.moveTo(X(s), 0); ctx.lineTo(X(s), S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, Z(s)); ctx.lineTo(S, Z(s)); ctx.stroke();
  }
  ctx.strokeStyle = '#565b63'; ctx.beginPath(); ctx.moveTo(0, Z(-104)); ctx.lineTo(S, Z(-104)); ctx.stroke();
  ctx.fillStyle = '#7d838c';
  for (const b of G.buildings) ctx.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), b.w * k, b.d * k);
  const dot = (x, z, color, r) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(X(x), Z(z), r || 3, 0, 7); ctx.fill(); };
  const wp = missionWaypoint(G);
  if (wp && G.screen === 'playing') {
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath(); ctx.moveTo(X(wp.x), Z(wp.z) - 7); ctx.lineTo(X(wp.x) + 6, Z(wp.z)); ctx.lineTo(X(wp.x), Z(wp.z) + 7); ctx.lineTo(X(wp.x) - 6, Z(wp.z)); ctx.closePath(); ctx.fill();
  }
  if (G.comet && G.mission.index === 1 && G.mission.stage === 'steal') dot(G.comet.x, G.comet.z, '#3aff5a', 4);
  if (G.limo && G.limo.active) dot(G.limo.x, G.limo.z, '#111111', 4);
  for (const c of G.police || []) dot(c.x, c.z, '#3a7bff', 4);
  // Player arrow: reads the car's heading while driving, the on-foot heading otherwise.
  const p = G.player;
  const px = p.car ? p.car.x : p.x, pz = p.car ? p.car.z : p.z;
  const heading = p.car ? p.car.angle : p.angle;
  ctx.save();
  ctx.translate(X(px), Z(pz));
  ctx.rotate(-heading);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function updateHud(G, dt) {
  const H = G.hud;
  if (!H) return;
  showScreens(G);
  if (G.screen !== 'playing' && G.screen !== 'paused') return;
  const p = G.player;
  H.healthFill.style.width = Math.max(0, p.health) + '%';
  H.healthText.textContent = 'HP ' + Math.ceil(p.health);
  H.money.textContent = '$' + Math.floor(p.money);
  H.weapon.textContent = p.weapon === 'pistol' ? 'PISTOL' : 'FISTS';
  H.stars.textContent = '\u2605'.repeat(G.wanted || 0) + '\u2606'.repeat(5 - (G.wanted || 0));
  H.stars.style.color = (G.wanted || 0) > 0 ? '#ffd23a' : '#888888';
  const mins = Math.floor(G.clockMin || 600);
  H.clock.textContent = String(Math.floor(mins / 60) % 24).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
  H.speed.textContent = p.car ? carSpeedKmh(G) + ' km/h' : '';
  H.objective.textContent = G.mission.index > 5 ? 'Free roam — Solmar Bay is yours' : ('\u25B8 ' + missionName(G) + ' — ' + missionObjective(G));
  // Context prompt.
  let prompt = '';
  if (p.car) prompt = 'E exit car · Space handbrake';
  else if (G.nearCar) prompt = 'Press E to enter car';
  else if (p.weapon === 'pistol') prompt = 'Click to shoot · Q fists';
  else prompt = 'Click to punch · Q pistol';
  if (G.bustTimer > 0.4) prompt = 'SHAKE THEM OFF — the cops are grabbing you!';
  H.prompt.textContent = prompt;
  if (G.bannerTimer > 0) {
    G.bannerTimer -= dt;
    H.banner.style.display = 'block';
    H.banner.textContent = G.banner || '';
  } else {
    H.banner.style.display = 'none';
  }
  H.crosshair.style.display = (p.weapon === 'pistol' && !p.car) ? 'block' : 'none';
  if (G.hitMark > 0) { G.hitMark -= dt; H.crosshair.style.color = '#ff4040'; }
  else H.crosshair.style.color = '#ffffff';
  H.hurt.style.opacity = G.hurtFlash > 0 ? String(Math.min(0.55, G.hurtFlash)) : '0';
  if (G.hurtFlash > 0) G.hurtFlash -= dt;
  drawMinimap(G);
}
