import Solver from './Solver'
import Grid2d from './Grid2d'
import Pattern from './Pattern'
import XYSet from './XYSet'
import poissonDiscSampler from './poissonSampler'

class Minefield {
  constructor(sx, sy, rng) {
    this.rng = rng === undefined ? Math.random : rng;
    this.grid = new Grid2d(sx, sy, '?');
    this.numMines = 0;
    this.solver = null;
    this.targetNumMines = -1;
    this.buildingIterator = null;
    this.initialSetToIgnore = null;
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

  placeMinesAndClearInitialField(mines, setToIgnore) {
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

  placeMinesRandomly(totalMines, setToIgnore) {
    if (setToIgnore === undefined) setToIgnore = new XYSet(this.grid);

    const options = new XYSet(this.grid);
    this.grid.forEachXYVal((x, y) => {
      if (!setToIgnore.has(x, y))
        options.add(x, y);
    });
    const mines = options.randomSubset(totalMines, this.rng);
    this.placeMinesAndClearInitialField(mines, setToIgnore);
  }

  placeMinesNicely(totalMines, setToIgnore) {
    // Add a bunch of points determined using a poisson process to the set to
    // ignore. This means the selected mines will be more lumpy
    // The 1.5 constant has been determined expermentally to yield good grids
    const radius = 1.2
    const newSetToIgnore = new XYSet(this.grid);
    newSetToIgnore.addFromSet(setToIgnore);
    for (const p of poissonDiscSampler(this.grid.sx, this.grid.sy, radius,
                                       this.rng)) {
      newSetToIgnore.addXY(Math.round(p[0]), Math.round(p[1]));
    }
    const numCells = this.grid.sx * this.grid.sy - newSetToIgnore.size
    if (numCells >= totalMines) {
      console.log(`Select ${totalMines} mines from ${numCells} cells`);
      this.placeMinesRandomly(totalMines, newSetToIgnore);
    } else {
      console.log(`Only ${numCells} cells remaining for ${totalMines} mines!`);
      console.log(`Using all the available cells`);
      this.placeMinesRandomly(totalMines, setToIgnore);
    }
  }



  placeMinesNoBadPattern(totalMines, setToIgnore) {
    let patterns = [
      Pattern.fromString(['*??*',     // Pattern 0
                          '?*#?',
                          '?#*?',
                          '*??*']),
      Pattern.fromString(['***',      // Pattern 1
                          '?*?',
                          '?#?',
                          '***']),
      Pattern.fromString(['***',      // Pattern 2
                          '?*?',
                          '?#?',
                          '???',
                          '?*?',
                          '?#?',
                          '***']),
      Pattern.fromString(['***',      // Pattern 3
                          '?*?',
                          '?#?',
                          '???',
                          '?*?',
                          '?#?',
                          '???',
                          '?*?',
                          '?#?',
                          '***']),
      Pattern.fromString(['***',      // Pattern 4
                          '*?*',
                          '***']),
      Pattern.fromString(['***',      // Pattern 5
                          '*?*',
                          '*?*',
                          '***']),
      Pattern.fromString(['***',      // Pattern 6
                          '*?*',
                          '*?*',
                          '*?*',
                          '***']),
      Pattern.fromString(['****',     // Pattern 7
                          '*??*',
                          '*??*',
                          '****']),
    ];
    patterns.push(patterns[0].rotate90cw());
    patterns.push(patterns[1].rotate90cw());
    patterns.push(patterns[1].rotate90cw().rotate90cw());
    patterns.push(patterns[1].rotate90cw().rotate90cw().rotate90cw());
    patterns.push(patterns[2].rotate90cw());
    patterns.push(patterns[2].rotate90cw().rotate90cw());
    patterns.push(patterns[2].rotate90cw().rotate90cw().rotate90cw());
    patterns.push(patterns[3].rotate90cw());
    patterns.push(patterns[3].rotate90cw().rotate90cw());
    patterns.push(patterns[3].rotate90cw().rotate90cw().rotate90cw());
    patterns.push(patterns[5].rotate90cw());
    patterns.push(patterns[6].rotate90cw());

    let badGrid = true;
    this.placeMinesNicely(totalMines, setToIgnore);
    while(badGrid) {
      badGrid = false;
      for (let i = 0; i < patterns.length; ++i) {
        const patternPos = patterns[i].findInGrid(this.grid);
        if (patternPos !== false) {
          badGrid = true;
          const [x, y] = patternPos;
          this.shuffleMinesInSquare(x - 2, y - 2,
              x + patterns[i].grid.sx + 2, y + patterns[i].grid.sy + 2,
              setToIgnore);
        }
      }
    }
  }

  placeMinesLogically(x, y, targetNumMines, initialSetToIgnore) {
    this.solver = new Solver(this, x, y);
    this.targetNumMines = targetNumMines;

    this.initialSetToIgnore = initialSetToIgnore;
    this.grid.forCellsInRing(x, y, 1,
        (xx, yy) => this.initialSetToIgnore.add(xx, yy));
    const setToIgnore = new XYSet(this.grid);
    setToIgnore.addFromSet(this.initialSetToIgnore);
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
      setToIgnore.addFromSet(this.initialSetToIgnore);
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

  shuffleMinesInSquare(x1, y1, x2, y2, setToIgnore) {
    x1 = Math.max(0, x1);
    y1 = Math.max(0, y1);
    x2 = Math.min(this.grid.sx, x2);
    y2 = Math.min(this.grid.sy, y2);

    let mineCount = 0;
    var set = new XYSet(this.grid);
    for (let x = x1; x < x2; ++x) {
      for (let y = y1; y < y2; ++y) {
        if (this.grid.getXY(x, y) === '*') mineCount++;
        this.grid.setXY(x, y, '?');
        if (!setToIgnore.has(x, y))
          set.addXY(x, y);
      }
    }
    set.randomSubset(mineCount, this.rng).forEachXY(
        (x, y) => this.grid.setXY(x, y, '*'));
    this.grid.forEachXYVal((x, y, val) => {
      if (val !== '*')
        this.grid.setXY(x, y, this.countMinesAroundXY(x, y));
    });
  }
}

export default Minefield;
