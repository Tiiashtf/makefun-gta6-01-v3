// Save to localStorage with Continue on the title screen, plus a 30 s autosave.
import { SAVE_KEY } from './config.js';

export function saveGame(G) {
  try {
    const p = G.player;
    const data = {
      v: 1, mission: G.mission.index, money: Math.floor(p.money), health: Math.ceil(p.health),
      x: p.x, z: p.z, wanted: G.wanted || 0, clockMin: Math.floor(G.clockMin || 600),
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    G.lastSaveAt = Date.now();
    return true;
  } catch { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1) return null;
    return d;
  } catch { return null; }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}

export function autosaveTick(G, dt) {
  G.saveTimer = (G.saveTimer || 0) + dt;
  if (G.saveTimer >= 25) {
    G.saveTimer = 0;
    if (G.screen === 'playing') saveGame(G);
  }
}
