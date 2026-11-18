// Six story missions, in order, with objectives, waypoints and stage flow.
import { CFG, LANDMARKS, MISSIONS } from './config.js';
import { spawnEnforcers, clearEnforcers, enforcersAlive } from './combat.js';
import { setWanted, clearPolice } from './wanted.js';

export function createMissions(G) {
  G.mission = { index: 0, stage: 'go' };
  G.noReinforce = false;
}

export function missionName(G) {
  return MISSIONS[Math.min(G.mission.index, 5)].name;
}

export function missionObjective(G) {
  const m = MISSIONS[Math.min(G.mission.index, 5)];
  const i = G.mission.index, s = G.mission.stage;
  if (i === 1 && s === 'deliver') return 'Deliver the Comet GT to Mara\u2019s Garage';
  if (i === 2 && s === 'clear') return 'Clear the enforcers at the Docks (' + enforcersAlive(G, 'docks') + ' left)';
  if (i === 4 && s === 'clear') return 'Clear Kaine Warehouse (' + enforcersAlive(G, 'warehouse') + ' left)';
  if (i === 5 && s === 'ram') return 'Ram Kaine\u2019s limo (' + (G.limo ? G.limo.rams : 0) + '/3)';
  return m.objective;
}

export function missionWaypoint(G) {
  const i = G.mission.index, s = G.mission.stage;
  if (i === 0) return MISSIONS[0].waypoint;
  if (i === 1) return s === 'steal' ? MISSIONS[1].waypoint : { x: LANDMARKS.garageForecourt.x, z: LANDMARKS.garageForecourt.z, r: LANDMARKS.garageForecourt.r };
  if (i === 2) return MISSIONS[2].waypoint;
  if (i === 3) return null;
  if (i === 4) return MISSIONS[4].waypoint;
  if (i === 5) return G.limo ? { x: G.limo.x, z: G.limo.z, r: 20 } : MISSIONS[5].waypoint;
  return null;
}

function completeMission(G) {
  const m = MISSIONS[G.mission.index];
  G.player.money += CFG.missionReward;
  G.audio.stinger();
  G.banner = 'Mission complete: ' + m.name + '  +$' + CFG.missionReward;
  G.bannerTimer = 4;
  G.mission.index += 1;
  if (G.mission.index > 5) {
    G.screen = 'complete';
    G.audio.siren(false);
    return;
  }
  startMission(G, G.mission.index);
}

export function startMission(G, i) {
  G.mission.index = i;
  G.mission.stage = 'go';
  if (i === 1) G.mission.stage = 'steal';
  if (i === 3) {
    G.mission.stage = 'lose';
    G.noReinforce = true;
    G.getawaySpawned = false;
    setWanted(G, 3);
    G.banner = 'Lose the cops — get clear and stay clear';
    G.bannerTimer = 4;
  }
  if (i === 5) {
    G.mission.stage = 'ram';
    if (G.limo) { G.limo.active = true; G.limo.rams = 0; G.limo.x = LANDMARKS.limoStart.x; G.limo.z = LANDMARKS.limoStart.z; G.limo.angle = LANDMARKS.limoStart.angle; }
    G.banner = 'Ram Kaine\u2019s limo 3 times!';
    G.bannerTimer = 4;
  }
  if (i < 3 || i === 4) {
    G.banner = 'Mission: ' + MISSIONS[i].name;
    G.bannerTimer = 4;
  }
}

export function restartMission(G) {
  const i = G.mission.index;
  if (i > 5) return;
  clearEnforcers(G);
  if (i === 3) { setWanted(G, 3); }
  if (i === 5 && G.limo) { G.limo.rams = 0; G.limo.x = LANDMARKS.limoStart.x; G.limo.z = LANDMARKS.limoStart.z; G.limo.active = true; }
  if (i === 1) G.mission.stage = 'steal';
  else if (i === 3) G.mission.stage = 'lose';
  else if (i === 5) G.mission.stage = 'ram';
  else G.mission.stage = 'go';
  G.banner = 'Mission restarted: ' + MISSIONS[i].name;
  G.bannerTimer = 3;
}

export function updateMissions(G, dt) {
  const p = G.player;
  const px = p.car ? p.car.x : p.x, pz = p.car ? p.car.z : p.z;
  const i = G.mission.index, s = G.mission.stage;
  if (i > 5 || G.screen !== 'playing') return;
  const near = (wp) => wp && Math.hypot(px - wp.x, pz - wp.z) < wp.r;
  if (i === 0) {
    if (near(MISSIONS[0].waypoint)) completeMission(G);
  } else if (i === 1) {
    if (s === 'steal' && p.car === G.comet) {
      G.mission.stage = 'deliver';
      G.banner = 'Deliver the Comet to Mara\u2019s Garage';
      G.bannerTimer = 3;
    } else if (s === 'deliver' && near({ x: LANDMARKS.garageForecourt.x, z: LANDMARKS.garageForecourt.z, r: LANDMARKS.garageForecourt.r })) {
      completeMission(G);
    }
  } else if (i === 2) {
    if (s === 'go' && near(MISSIONS[2].waypoint)) {
      spawnEnforcers(G, LANDMARKS.docks.x, LANDMARKS.docks.z, 4, 'docks');
      G.mission.stage = 'clear';
      G.banner = 'Ambush! Clear the enforcers';
      G.bannerTimer = 3;
    } else if (s === 'clear' && enforcersAlive(G, 'docks') === 0) {
      completeMission(G);
    }
  } else if (i === 3) {
    if (s === 'lose' && G.wanted === 0) {
      G.noReinforce = false;
      completeMission(G);
    }
  } else if (i === 4) {
    if (s === 'go' && near(MISSIONS[4].waypoint)) {
      spawnEnforcers(G, LANDMARKS.warehouse.x, LANDMARKS.warehouse.z, 5, 'warehouse');
      G.mission.stage = 'clear';
      G.banner = 'Kaine\u2019s crew — take them down';
      G.bannerTimer = 3;
    } else if (s === 'clear' && enforcersAlive(G, 'warehouse') === 0) {
      completeMission(G);
    }
  } else if (i === 5) {
    if (s === 'ram' && G.limo && G.limo.rams >= 3) completeMission(G);
  }
  void dt;
}
