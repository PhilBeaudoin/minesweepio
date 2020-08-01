let seed = 9391;
function myRandom() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280.0;
}

export function pickRandomlyFromSet(n, set) {
  const array = Array.from(set);
  let result = new Set();
  for (let i = array.length - n; i < array.length; ++i) {
    let idx = Math.floor(Math.random() * (i + 1));
//    let idx = Math.floor(myRandom() * (i + 1));
    if (result.has(array[idx]))
      result.add(array[i]);
    else
      result.add(array[idx]);
  }
  return result;
}

export function areNeighbors(x1, y1, x2, y2) {
  return Math.abs(x2 - x1) <= 1 &&  Math.abs(y2 - y1) <= 1;
}

// Find the group of cells shared between two cells.
export function sharedGroup(x1, y1, x2, y2) {
  const d = [x2 - x1, y2 - y1];
  const ad = d.map(Math.abs);
  const sd = d.map(v => Math.sign(2*v + 1));
  const dMax = Math.max(...ad);
  const dMin = Math.min(...ad);
  const majAxisIdx = ad.indexOf(dMax);  // 0 = x, 1 = y
  const minAxisIdx = 1 - majAxisIdx;       // 0 = x, 1 = y
  const majAxis = [(1 - majAxisIdx) * sd[0], majAxisIdx * sd[1]];
  const minAxis = [(1 - minAxisIdx) * sd[0], minAxisIdx * sd[1]];

  // Patterns beyond the radius 2 "circle" dont have groups of shared cells
  if (dMax === 0 || dMax > 2 || dMin >= 2) return [];

  // Adjacent cells, the shared group has 4 cells
  if (dMin === 0 && dMax === 1) {
    return [
      [x1 - minAxis[0], y1 - minAxis[1]],
      [x1 + minAxis[0], y1 + minAxis[1]],
      [x2 - minAxis[0], y2 - minAxis[1]],
      [x2 + minAxis[0], y2 + minAxis[1]]
    ];
  }

  // Diagonal cells, the shared group has 2 cells
  if (dMin === 1 && dMax === 1) {
    return [
      [x1, y2],
      [x2, y1]
    ];
  }

  // Separated cells, the shared group has 3 cells
  if (dMin === 0 && dMax === 2) {
    return [
      [x1 + majAxis[0] - minAxis[0], y1 + majAxis[1] - minAxis[1]],
      [x1 + majAxis[0], y1 + majAxis[1]],
      [x1 + majAxis[0] + minAxis[0], y1 + majAxis[1] + minAxis[1]],
    ];
  }

  // Separated diagonal cells, the shared group has 2 cells
  if (dMin === 1 && dMax === 2) {
    return [
      [x1 + majAxis[0], y1 + majAxis[1]],
      [x2 - majAxis[0], y2 - majAxis[1]],
    ];
  }
}
