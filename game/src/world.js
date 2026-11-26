// world.js — the island chain: terrain height, ring course and runway.
// All terrain is a deterministic function of (x, z): no assets, no network.

export const SEA_LEVEL = 0;
export const COURSE_LENGTH = 4200;

// Island peaks: [centreX, centreZ, radius, height]
export const ISLANDS = [
  [0, 650, 420, 64],
  [330, 1350, 380, 88],
  [-360, 1950, 430, 72],
  [120, 2650, 360, 96],
  [-140, 3350, 400, 60],
  [40, 3950, 460, 78],
];

export const RINGS = [
  { x: 0, y: 62, z: 420, r: 30 },
  { x: 140, y: 78, z: 900, r: 28 },
  { x: 300, y: 96, z: 1350, r: 28 },
  { x: 60, y: 84, z: 1800, r: 26 },
  { x: -320, y: 92, z: 2200, r: 28 },
  { x: -60, y: 88, z: 2650, r: 26 },
  { x: 120, y: 80, z: 3150, r: 26 },
  { x: 40, y: 66, z: 3650, r: 30 },
];

export const RUNWAY = {
  x: 40, zStart: 3900, zEnd: 4400, width: 44, heading: 0,
};

function rollingHills(x, z) {
  return (
    14 * Math.sin(x * 0.011 + 1.7) * Math.cos(z * 0.009 + 0.6) +
    9 * Math.sin(x * 0.023 - 0.4) * Math.sin(z * 0.017 + 2.1) +
    5 * Math.sin((x + z) * 0.045 + 0.9)
  );
}

function islandBump(x, z) {
  let h = 0;
  for (const [cx, cz, radius, peak] of ISLANDS) {
    const dx = (x - cx) / radius;
    const dz = (z - cz) / radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < 1) h += peak * (1 - d2) * (1 - d2);
  }
  return h;
}

/** Height of the ground at world (x, z). Below ~2 is open sea. */
export function terrainHeight(x, z) {
  if (z < -200 || z > COURSE_LENGTH + 600) return -6;
  const hills = rollingHills(x, z);
  const bump = islandBump(x, z);
  let h;
  if (bump < 1 && hills < 2) h = -6; // open water between islands
  else h = Math.max(-6, hills * 0.4 + bump);
  // Airfield plateau: flatten the ground under and around the runway, with a
  // gentle valley on the final approach so the descent from ring 8 is smooth.
  const rx = Math.abs(x - RUNWAY.x);
  if (z > 3600 && z < 4550 && rx < 220) {
    const side = Math.max(0, Math.min(1, (220 - rx) / 90));
    const zEdge = Math.min(Math.max(0, (z - 3600) / 120), Math.max(0, (4550 - z) / 120), 1);
    const f = Math.min(side, zEdge);
    h = h * (1 - f) + 14 * f;
  }
  return h;
}

/** Colour of a terrain sample: sea, sand, grass, rock or snow by height. */
export function terrainColor(h, depthShade) {
  let base;
  if (h < 2) base = [16, 92, 138]; // sea shallows
  else if (h < 5) base = [214, 196, 138]; // beach sand
  else if (h < 34) base = [74, 148, 74]; // meadow green
  else if (h < 68) base = [104, 132, 70]; // high grass / scrub
  else if (h < 86) base = [168, 152, 128]; // pale rock, only the peaks
  else base = [232, 236, 240]; // snow caps
  const s = depthShade;
  return `rgb(${Math.round(base[0] * s)},${Math.round(base[1] * s)},${Math.round(base[2] * s)})`;
}

/** True when the point is over dry land. */
export function isLand(x, z) {
  return terrainHeight(x, z) > 2;
}

/** Distance from the plane to a ring centre. */
export function ringDistance(plane, ring) {
  const dx = plane.x - ring.x;
  const dy = plane.alt - ring.y;
  const dz = plane.z - ring.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** True when the plane is over the runway strip. */
export function overRunway(plane) {
  return (
    Math.abs(plane.x - RUNWAY.x) < RUNWAY.width / 2 &&
    plane.z > RUNWAY.zStart &&
    plane.z < RUNWAY.zEnd
  );
}
