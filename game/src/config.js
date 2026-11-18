// Solmar Bay — world constants, landmarks, missions, controls.
export const CFG = {
  seed: 20261117,
  worldHalf: 240,
  streetLines: [-196, -140, -84, -28, 28, 84, 140, 196],
  streetHalf: 7,
  blockCenters: [-168, -112, -56, 0, 56, 112, 168],
  blockHalf: 21,
  avenueZ: -104, // cross-city avenue (the "ring road" for mission 6)
  beachZ: 203,
  seaZ: 225,
  walkSpeed: 5,
  runSpeed: 10,
  carTopSpeed: 34,
  carAccel: 16,
  carBrake: 30,
  carReverse: 10,
  policeSpeed: 25,
  paintCost: 150,
  paintRadius: 18,
  bustHold: 2.5,
  decayPerStar: 15,
  lostDistance: 50,
  lostTime: 3,
  trafficCount: 16,
  pedCount: 26,
  startMoney: 250,
  missionReward: 500,
  respawn: { x: 78, z: -8 },
  startPos: { x: 20, z: 96 },
};

export const LANDMARKS = {
  garage: { x: 0, z: 124, name: "Mara's Garage" },
  garageForecourt: { x: 26, z: 112, r: 10 },
  cometParked: { x: 84, z: 112, angle: Math.PI },
  docks: { x: 170, z: 75, r: 16, name: 'The Docks' },
  warehouse: { x: -150, z: 118, r: 16, name: 'Kaine Warehouse' },
  paint: { x: -56, z: -146, r: 18, name: "Lou's Paint & Spray" },
  general: { x: 56, z: 0, name: 'Solmar General' },
  spire: { x: -168, z: -168, name: 'Glass Spire' },
  plaza: { x: 0, z: 0, name: 'Sun Plaza' },
  cafe: { x: 0, z: 176, name: 'Harbor Cafe' },
  marina: { x: -150, z: 215, name: 'Marina' },
  pier: { x: 150, z: 220, name: 'Pier' },
  limoStart: { x: 0, z: -104, angle: Math.PI / 2 },
};

// Blocks that hold a landmark instead of random buildings: [blockX, blockZ].
export const LANDMARK_BLOCKS = [
  [0, 112], [168, 56], [-168, 112], [-56, -168],
  [56, 0], [-168, -168], [0, 0], [0, 168],
];

export const MISSIONS = [
  { id: 0, name: 'Welcome Home', objective: 'Walk to Mara\u2019s Garage and meet Mara', waypoint: { x: 26, z: 112, r: 16 } },
  { id: 1, name: 'Hot Wheels', objective: 'Steal the Comet GT', waypoint: { x: 84, z: 112, r: 8 } },
  { id: 2, name: 'The Pickup', objective: 'Clear the enforcers at the Docks', waypoint: { x: 170, z: 75, r: 16 } },
  { id: 3, name: 'Getaway', objective: 'Lose the 3-star wanted level', waypoint: null },
  { id: 4, name: 'Payback', objective: 'Clear Kaine Warehouse', waypoint: { x: -150, z: 118, r: 16 } },
  { id: 5, name: 'King of the Bay', objective: 'Ram Kaine\u2019s limo 3 times', waypoint: { x: 0, z: -104, r: 20 } },
];

export const CONTROLS = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
  enter: 'KeyE', weapon: 'KeyQ', run: 'ShiftLeft', handbrake: 'Space',
  restart: 'KeyR', pause: 'Escape', mute: 'KeyM',
};

export const SAVE_KEY = 'solmar-bay-save-v1';
