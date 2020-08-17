import Grid2d from './Grid2d.js';

class Pattern {

  static fromString(strings) {
    let sy = strings.length;
    if (sy === 0) {
      console.log('Error! Pattern needs at least one string.');
      return null;
    }
    let sx = strings[0].length;
    if (sx === 0) {
      console.log('Error! Pattern strings need at least 1 character.');
      return null;
    }

    let pattern = new Pattern(sx, sy);
    strings.forEach((str, y) => {
      if (str.length !== sx) {
        console.log('Error! All pattern strings must be the same length.');
        return null;
      }
      for (var x = 0; x < str.length; x++)
        pattern.grid.setXY(x, y, str.charAt(x));
    });

    return pattern;
  }

  // A Grid2d is a simple object {sx, sy, rows}
  // It can be initialized with a value, with an object or with a function that
  // gets called in every cell.
  constructor(sx, sy) {
    this.grid = new Grid2d(sx, sy, '?');
  }

  rotate90cw() {
    let other = new Pattern(this.grid.sy, this.grid.sx);

    this.grid.forEachXYVal((x, y, val) => {
      other.grid.setXY(this.grid.sy - y - 1, x, val);
    });

    return other;
  }

  testAt(grid, x, y) {
    return this.grid.allXYVal((xx, yy, val) => {
      if (val === '?') return true;
      let px = x + xx;
      let py = y + yy;
      // The border around the grid is considered '*'.
      if (px < 0 || py < 0 || px >= grid.sx || py >= grid.sy)
        return val === '*';
      // We are within the grid.
      let gridVal = grid.getXY(px, py);
      if (val === '*') return gridVal === '*';
      return Number.isInteger(gridVal);
    });
  }

  findInGrid(grid) {
    for (let x = -1; x < grid.sx - this.grid.sx + 2; ++x) {
      for (let y = -1; y < grid.sy - this.grid.sy + 2; ++y) {
        if (this.testAt(grid, x, y)) return [x, y];
      }
    }
    return false;
  }
}

export default Pattern;