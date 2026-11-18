// Deterministic scene staging for screenshots, driven by ?shot=<name>&seed=<seed>.
// Each shot sets real game state (positions, wanted, mission, lighting) and lets the
// normal camera and HUD do the rest — no faked renders.
import { LANDMARKS } from './config.js';
import { setWanted } from './wanted.js';
import { spawnEnforcers } from './combat.js';
import { startMission } from './missions.js';

function putInComet(G, x, z, angle, speed) {
  const c = G.comet;
  c.x = x; c.z = z; c.angle = angle; c.speed = speed; c.owned = true;
  const i = G.traffic.indexOf(c);
  if (i >= 0) G.traffic.splice(i, 1);
  G.player.car = c;
  G.player.mesh.visible = false;
  c.mesh.position.set(x, 0, z); c.mesh.rotation.y = angle;
}

export function applyShot(G, name) {
  G.screen = 'playing';
  G.bannerTimer = 0;
  if (name === 'cover') {
    // Comet GT getaway at speed, 3 stars, cruisers in pursuit.
    putInComet(G, -40, -104, Math.PI / 2, 26);
    setWanted(G, 3);
    G.camYaw = Math.PI / 2;
    G.banner = 'Getaway!';
    G.bannerTimer = 2;
  } else if (name === 'street') {
    // On foot downtown by Sun Plaza.
    G.player.x = 10; G.player.z = 14; G.player.angle = Math.PI * 0.9;
    G.player.mesh.position.set(10, 0, 14);
    G.camYaw = Math.PI * 0.85;
    setWanted(G, 0);
  } else if (name === 'mission') {
    // Docks gunfight, pistol out, enforcers in view.
    startMission(G, 2);
    G.mission.stage = 'clear';
    spawnEnforcers(G, LANDMARKS.docks.x, LANDMARKS.docks.z, 3, 'docks');
    G.player.x = 152; G.player.z = 78; G.player.angle = Math.PI / 2;
    G.player.weapon = 'pistol';
    G.player.mesh.position.set(152, 0, 78);
    G.camYaw = Math.PI / 2;
    setWanted(G, 2);
  } else if (name === 'finale') {
    // Dusk: ramming Kaine's limo on the avenue, 4 stars.
    G.dusk = true;
    if (G.sun) { G.sun.color.setHex(0xff9a4a); G.sun.intensity = 1.25; }
    if (G.hemi) G.hemi.intensity = 0.35;
    G.scene.background = G.scene.background || null;
    startMission(G, 5);
    G.mission.stage = 'ram';
    G.limo.active = true; G.limo.rams = 2;
    G.limo.x = 20; G.limo.z = -104; G.limo.angle = Math.PI / 2;
    G.limo.mesh.position.set(20, 0, -104); G.limo.mesh.rotation.y = Math.PI / 2;
    putInComet(G, -6, -104, Math.PI / 2, 20);
    setWanted(G, 4);
    G.camYaw = Math.PI / 2;
  }
}
