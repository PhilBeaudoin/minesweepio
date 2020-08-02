class XYSet {

  // A simple set that contains X, Y coordinates from a Grid2d
  constructor(grid) {
    this.grid = grid;
    this.set = new Set();
  }

  get size() { return this.set.size; }
  clear() { this.set.clear(); }

  hasKey(key) { return this.set.has(key); }
  addKey(key) { this.set.add(key); }
  deleteKey(key) { this.set.delete(key); }
  hasXY(x, y) { return this.set.has(this.grid.toKey(x,y)); }
  addXY(x, y) { this.set.add(this.grid.toKey(x, y)); }
  deleteXY(x, y) { this.set.delete(this.grid.toKey(x, y)); }
  forEachKey(func) { this.set.forEach(func); }
  forEachXY(func) {
    this.set.forEach(key => func(...this.grid.fromKey(key)));
  }
  forEachXYKey(func) {
    this.set.forEach(key => func(...this.grid.fromKey(key), key));
  }

  // Private utility function
  select(args, f1, f2) { return args.length === 1 ? f1(...args) : f2(...args); }

  // Convenient shortcuts with variable arguments
  has() { return this.select(arguments, this.hasKey.bind(this), this.hasXY.bind(this)); }
  add() { return this.select(arguments, this.addKey.bind(this), this.addXY.bind(this)); }
  delete() { return this.select(arguments, this.deleteKey.bind(this), this.deleteXY.bind(this)); }

  // Advanced methods below
  randomSubset(n, rng) {
    if (rng === undefined) rng = Math.random;
    let result = new XYSet(this.grid);
    const array = Array.from(this.set);
    for (let i = array.length - n; i < array.length; ++i) {
      let idx = Math.floor(rng() * (i + 1));
      if (result.hasKey(array[idx]))
        result.addKey(array[i]);
      else
        result.addKey(array[idx]);
    }
    return result;
  }
}

export default XYSet;