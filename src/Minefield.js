import Solver from './Solver'
import Grid2d from './Grid2d'
import XYSet from './XYSet'

class Minefield {
  constructor(sx, sy, rng) {
    this.rng = rng === undefined ? Math.random : rng;
    this.grid = new Grid2d(sx, sy, '?');
    this.numMines = 0;
    this.solver = null;
    this.targetNumMines = -1;
    this.buildingIterator = null;
  }

  isComplete() {
    if (this.solver === null)
      return this.countVals('?') === 0;
    else
      return this.solver.numDeducted === this.grid.sx * this.grid.sy;
  }

  // Count every cell that has a value in vals, which is an array of element.
  countVals(vals) {
    let count = 0;
    this.grid.forEach(val => count += (vals.indexOf(val) === -1 ? 0 : 1));
    return count;
  }

  placeMinesRandomly(totalMines, setToIgnore) {
    if (setToIgnore === undefined) setToIgnore = new XYSet(this.grid);

    const options = new XYSet(this.grid);
    this.grid.forEachXYVal((x, y) => {
      if (!setToIgnore.has(x, y))
        options.add(x, y);
    });
    const mines = options.randomSubset(totalMines, this.rng);
    this.grid.forEachXYVal((x, y) => {
      if (setToIgnore.has(x, y)) {
        this.grid.setXY(x, y, this.grid.getXY(x, y) === '*' ? '*' : '?');
      } else {
        this.grid.setXY(x, y, mines.has(x, y) ? '*' : '?');
      }
    });
    this.numMines = mines.size;

    this.grid.forEachXYVal((x, y, val) => {
      if (val === '?')
        this.grid.setXY(x, y, this.countMinesAroundXY(x, y));
    });
  }

  placeMinesLogically(x, y, targetNumMines) {
    this.solver = new Solver(this, x, y);
    this.targetNumMines = targetNumMines;

    const setToIgnore = new XYSet(this.grid);
    this.grid.forCellsInRing(x, y, 1, (xx, yy) => setToIgnore.add(xx, yy));
    this.placeMinesRandomly(targetNumMines, setToIgnore);
    this.buildingIterator = this.logicalPlacerIterator();
  }

  continueBuilding() {
    return this.buildingIterator.next();
  }

  *logicalPlacerIterator() {
    let iter = 0;
    while (!this.isComplete() && iter < 500) {
      ++iter;

      // Solve as much as possible.
      this.solver.start();
      if (this.isComplete()) break;

      // Clear undeducted cells, compute number of mines to place
      let minesToPlace = this.targetNumMines;
      const setToIgnore = new XYSet(this.grid);
      this.solver.grid.forEachXYVal((xx, yy, solverVal) => {
        if (solverVal.deducted) {
          const val = this.grid.getXY(xx, yy);
          // Keep deducted digits or mines with enough neighbor.
          if (val === '*' && this.rng() * 8 < solverVal.remainingUnknowns)
            return;
          setToIgnore.add(xx, yy);
          if (val === '*') minesToPlace--;
        }
      });

      // Place mines randomly.
      minesToPlace = this.adjustNumMines(minesToPlace, this.targetNumMines,
                                         setToIgnore.size);
      this.placeMinesRandomly(minesToPlace, setToIgnore);
      yield;
    }
    console.log('iter = ', iter);

    this.numMines = this.countVals('*');
  }

  adjustNumMines(minesToPlace, targetNumMines, spacesFrozen) {
    const maxDensity = 0.7;
    const hardDensity = 0.3;
    const medDensity = 0.25;

    const spacesTotal = this.grid.sx * this.grid.sy;
    const spacesLeft = spacesTotal - spacesFrozen;
    let desiredDensity = minesToPlace / spacesLeft;
    if (desiredDensity > hardDensity)
      desiredDensity *= 1 + 1.9 * (spacesLeft / spacesTotal);
    else if (desiredDensity > medDensity)
      desiredDensity *= 1 + 0.8 * (spacesLeft / spacesTotal);
    desiredDensity = Math.min(maxDensity, desiredDensity)
    return Math.round(spacesLeft * desiredDensity);
  }

  countMinesAroundXY(x, y) {
    return this.grid.countAroundXYIf(x, y, val => val === '*');
  }
}

export default Minefield;
