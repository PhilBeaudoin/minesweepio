class Grid2d {

  // A Grid2d is a simple object {sx, sy, rows}
  // It can be initialized with a value, with an object or with a function that
  // gets called in every cell.
  constructor(sx, sy, val) {
    this.sx = sx;
    this.sy = sy;
    this.rows = new Array(this.sx);
    for (let y = 0; y < sy; ++y) {
      this.rows[y] = new Array(sx);
      for (let x = 0; x < sx; ++x) {
        if (typeof val === 'object')
          this.rows[y][x] = {...val};
        else if (typeof val === 'function')
          this.rows[y][x] = val(x, y);
        else
          this.rows[y][x] = val;
      }
    }
  }

  ///////////////////////////////////////////////////////////////////////
  // Basic utilities.
  isValidXY(x, y) { return x >= 0 && y >= 0 && x < this.sx && y < this.sy; }

  ///////////////////////////////////////////////////////////////////////
  // Getter, setter and iterator for simple grids.
  getXY(x, y) { return this.rows[y][x]; }
  setXY(x, y, val) { this.rows[y][x] = val; }
  forEach(func) {
    this.rows.forEach(cols => cols.forEach(val => func(val)));
  }
  forEachXYVal(func) {
    for (let y = 0; y < this.sy; ++y)
      for (let x = 0; x < this.sx; ++x)
        func(x, y, this.getXY(x, y));
  }
  allXYVal(func) {
    for (let y = 0; y < this.sy; ++y)
      for (let x = 0; x < this.sx; ++x)
        if (!func(x, y, this.getXY(x, y))) return false;
    return true;
  }

  ///////////////////////////////////////////////////////////////////////
  // Methods to convert a coord to a unique key for hashing
  toKey(x, y) { return y * this.sx + x; }
  fromKey(key) { return [key % this.sx, Math.floor(key / this.sx)]; }

  ///////////////////////////////////////////////////////////////////////
  // Methods to iterate on neighborhoods
  neighbors(x, y) { return this.neighborsValidate(x, y, () => true); }

  neighborsValidate(x, y, validator) {
    let output = [];
    this.forEachNeighborValidate(x, y, validator,
                                 (x, y) => output.push([x, y]));
    return output;
  }

  forEachNeighbor(x, y, func) {
    this.forEachNeighborValidate(x, y, () => true, func);
  }

  forEachNeighborValidate(x, y, validator, func) {
    this.forCellsInRingValidate(x, y, 1,
      (xx, yy) => (xx !== x || yy !== y) && validator(xx, yy),
      func);
  }

  forCellsInRing(x, y, ring, func) {
    this.forCellsInRingValidate(x, y, ring, () => true, func);
  }

  forCellsInRingValidate(x, y, ring, validator, func) {
    for (let xx = x - ring; xx <= x + ring; ++xx) {
      for (let yy = y - ring; yy <= y + ring; ++yy) {
        if (this.isValidXY(xx, yy) && validator(xx, yy))
          func(xx, yy);
      }
    }
  }

  ///////////////////////////////////////////////////////////////////////
  // Methods to count in neighborhood
  countAroundXYIf(x, y, countIf) {
    let count = 0;
    this.forEachNeighbor(x, y,
      (xx, yy) => count += countIf(this.getXY(xx, yy)) ? 1 : 0);
    return count;
  }

  ///////////////////////////////////////////////////////////////////////
  // Logging & Debugging
  toString() {
    let out = '';
    for (let y = 0; y < this.sy; ++y) {
      for (let x = 0; x < this.sx; ++x) {
        out += this.getXY(x, y);
      }
      out += '\n';
    }
    return out;
  }

}

export default Grid2d;

