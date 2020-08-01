import {pickRandomlyFromSet, sharedGroup, areNeighbors} from './utils';

class Minesweeper {
  constructor(sx, sy) {
    this.sx = sx;
    this.sy = sy;
    this.exploded = false;
    this.init();
  }

  init() {
    this.userGrid = this.createArray(' ');
    this.grid = this.createArray('?');
    this.numUnknowns = this.sx * this.sy;
    this.numMines = 0;
    this.numFlags = 0;
    this.boundary = new Set();
    this.toDeduct = new Set();
    this.deducted = new Set();
  }

  hasExploded() {
    return this.exploded;
  }

  revealAt(x, y) {
    if (this.getUserXY(x, y) === '.') return;
    this.setUserXY(x, y, '.');
    const val = this.getXY(x, y);
    if (val === '*')
      this.exploded = true;
    else if (val === 0)
      this.forEachNeighbor(x, y, (xx, yy) => this.revealAt(xx, yy));
  }

  combinedGrid() {
    const output = this.createArray('  ');
    for (let x = 0; x < this.sx; ++x) {
      for (let y = 0; y < this.sy; ++y) {
        output[y][x] = this.getXY(x, y) + this.getUserXY(x, y);
      }
    }
    return output;
  }

  isComplete() {
    return this.numUnknowns === 0 && this.boundary.size === 0 &&
           this.toDeduct.size === 0 && this.deducted.size === 0;
  }

  createArray(val) {
    let result = new Array(this.sx);
    for (let y = 0; y < this.sy; ++y) {
      result[y] = new Array(this.sx)
      for (let x = 0; x < this.sx; ++x)
        result[y][x] = typeof val === 'object' ? {...val} : val;
    }
    return result;
  }

  getXY(x, y) {
    return this.grid[y][x];
  }

  setXY(x, y, val) {
    this.grid[y][x] = val;
  }

  getUserXY(x, y) {
    return this.userGrid[y][x];
  }

  setUserXY(x, y, val) {
    if (this.userGrid[y][x] == 'f') this.numFlags--;
    if (val == 'f') this.numFlags++;
    this.userGrid[y][x] = val;
  }

  getCounts(x, y) {
    return this.counts[y][x];
  }

  xyToKey(x, y) {
    return y * this.sx + x;
  }

  keyToXY(key) {
    return [key % this.sx, Math.floor(key / this.sx)];
  }

  start(x, y) {
    this.numUnknowns--;
    this.setXY(x, y, 0);
    this.forEachNeighbor(x, y, (xx, yy) => {
      this.numUnknowns--;
      this.setXY(xx, yy, '#');
      this.deducted.add(this.xyToKey(xx, yy));
    });
    this.deducted.forEach(
      (key) => this.addToBoundaryAround(...this.keyToXY(key)));
  }

  countVals(vals) {
    let count = 0;
    for (let x = 0; x < this.sx; ++x) {
      for (let y = 0; y < this.sy; ++y) {
        if (vals.indexOf(this.getXY(x, y)) !== -1)
          count++;
      }
    }
    return count;
  }

  fillUnknownsWithEmpty() {
    for (let x = 0; x < this.sx; ++x) {
      for (let y = 0; y < this.sy; ++y) {
        if (this.getXY(x, y) === '?') {
          this.setXY(x, y, this.countAllMinesAroundXY(x, y));
          this.numUnknowns--;
        }
      }
    }
  }

  fillUnknownsWithMines() {
    for (let x = 0; x < this.sx; ++x) {
      for (let y = 0; y < this.sy; ++y) {
        if (this.getXY(x, y) === '?') {
          this.setXY(x, y, '*');
          this.numUnknowns--;
          this.numMines++;
        }
      }
    }
  }

  getClues() {
    let clues = new Set();
    this.toDeduct.forEach(key => {
      const [x, y] = this.keyToXY(key);
      this.forEachNeighbor(x, y,
        (xx, yy) => {
          if(Number.isInteger(this.getXY(xx, yy)))
            clues.add(this.xyToKey(xx, yy));
        }
      );
    });
    return clues;
  }

  placeMinesOnBoundary(totalMines) {
    // First place mines along the boundary
    const numMines = Math.max(0, Math.round((totalMines - this.numMines) *
                this.boundary.size / (this.numUnknowns + this.boundary.size)));
    const mineSet = pickRandomlyFromSet(numMines, this.boundary);
    this.boundary.forEach(key => {
      this.toDeduct.add(key);
      const [x, y] = this.keyToXY(key);
      if (mineSet.has(key)) {
        this.setXY(x, y, 'B');
        this.numMines++;
      } else {
        this.setXY(x, y, 'N');
      }
    });

    // Then fill all the deducted numbers
    this.deducted.forEach(key => {
      const [x, y] = this.keyToXY(key);
      if (this.getXY(x, y) === '#')
        this.setXY(x, y, this.countAllMinesAroundXY(x, y));
    });
    this.deducted = new Set();

    this.doDeductions();
    this.extendBoundary();
  }

  clearDeducted() {
    let toDeductAgain = new Set();
    this.toDeduct.forEach(key => {
      const [x, y] = this.keyToXY(key);
      const val = this.getXY(x, y);
      if (val === 'B') this.numMines--;
      this.setXY(x, y, '?');
      this.numUnknowns++;

      this.forEachNeighbor(x, y, (xx, yy) => {
        const val = this.getXY(xx, yy);
        if (Number.isInteger(val)) {
          toDeductAgain.add(this.xyToKey(xx, yy));
          this.setXY(xx, yy, 'N');
        } else if (val === '*') {
          toDeductAgain.add(this.xyToKey(xx, yy));
          this.setXY(xx, yy, 'B');
        }
      });
    });
    this.toDeduct = toDeductAgain;
  }

  backtrack() {

    this.removeBlockingMines();

    while(this.toDeduct.size > 0) {
      // We want to reset every 'N' and 'B' to unknowns and
      // anything that touched an 'N' or 'B' bust be deducted again.
      this.clearDeducted();
      this.doDeductions();
    }
    this.extendBoundary();
  }

  removeBlockingMines() {
    // Find any portions containing '?' fenced on all sides by mines or the
    // edge of the grid. Then replace all of these by 'B'.
    const visited = new Set();
    const frontier = [];

    const maybeAddToFrontier = (x, y) => {
      const key = this.xyToKey(x, y);
      if (!visited.has(key)) {
        visited.add(key);
        frontier.push([x, y]);
      }
    }

    const visit = (x, y) => {
      const val = this.getXY(x, y);
      if (val === '?')
        this.forEachNeighbor(x, y, maybeAddToFrontier);
      return val;
    }

    for (let x = 0; x < this.sx; ++x) {
      for (let y = 0; y < this.sy; ++y) {
        if (this.getXY(x, y) === '?')
          maybeAddToFrontier(x, y);
        const mines = [];
        let fencedOff = true;
        while(frontier.length > 0) {
          const xy = frontier.pop();
          const val = visit(...xy);
          if (val === '*')
            mines.push(xy)
          else if (val !== '?')
            fencedOff = false;
        }
        if (fencedOff) {
          mines.forEach(xy => {
            this.setXY(...xy, 'B');
            this.toDeduct.add(this.xyToKey(...xy));
          });
        }
      }
    }
  }

  doDeductions() {
    // Then try to deduct all the cells
    let clues = this.getClues();
    let prevSize = -1;
    while (prevSize !== this.deducted.size) {
      this.fillCounts(clues);
      prevSize = this.deducted.size;
      clues.forEach(key => this.deductAround(...this.keyToXY(key)));
      if (prevSize === this.deducted.size) {
        // No extra deduction, do the more complex ones.
        clues.forEach(key => {
          const [x, y] = this.keyToXY(key);
          this.forCellsInRing(x, y, 2, (xx, yy) => {
            const key2 = this.xyToKey(xx, yy);
            if (key < key2 && clues.has(key2))
              this.deductForPair(x, y, xx, yy);
          });
        });
      }
    }
  }

  extendBoundary() {
    // Extend the boundary around each deducted number
    this.boundary = new Set();
    let deductedNext = new Set();
    this.deducted.forEach(key => {
      this.toDeduct.delete(key);
      const [x, y] = this.keyToXY(key);
      if (this.getXY(x, y) === '#') {
        if (this.countSpacesAroundXY(x, y) === 0) {
          this.setXY(x, y, this.countAllMinesAroundXY(x, y));
        } else {
          this.addToBoundaryAround(x, y);
          deductedNext.add(key);
        }
      }
    });
    this.deducted = deductedNext;
  }

  fillCountAt(x, y) {
    const val = this.getXY(x, y);
    if (this.getCounts(x, y).remainingMines === -1) {
      this.getCounts(x, y).remainingMines =
          val - this.countKnownMinesAroundXY(x, y);
    }
    if (this.getCounts(x, y).remainingSpaces === -1) {
      this.getCounts(x, y).remainingSpaces =
          this.countSpacesAroundXY(x, y);
    }
  }

  fillCounts(clues) {
    this.counts = this.createArray({remainingMines: -1, remainingSpaces: -1 });
    clues.forEach(key => this.fillCountAt(...this.keyToXY(key)));
  }

  deductAround(x, y) {
    const counts = this.getCounts(x, y);
    if (counts.remainingMines === 0)
      this.placeDeductedAround(x, y, '#');
    else if (counts.remainingMines === counts.remainingSpaces)
      this.placeDeductedAround(x, y, '*');
  }

  deductForPair(x1, y1, x2, y2) {
    let cells = [[x1, y1], [x2, y2]];
    let counts = cells.map(xy => this.getCounts(...xy));
    const sharedCells = sharedGroup(x1, y1, x2, y2).filter((xy) => {
      if (!this.isValidXY(...xy)) return false;
      const val = this.getXY(...xy);
      return val === 'N' || val === 'B';
    });
    const numSharedCells = sharedCells.length;

    for (let i = 0; i < 2; ++i) {
      // If Cell A has N remaining mines
      // and it has K empty cells shared with Cell B
      // and Cell B has S remaining spaces around it
      // and Cell B has S-K+N remaining mines
      // THEN
      //   All the non-shared spaces around cell A are '#'
      //   All the non-shared spaces around cell B are '*'
      let [a, b] = [i, 1-i];
      if (counts[b].remainingMines === counts[b].remainingSpaces -
              numSharedCells + counts[a].remainingMines) {
        this.placeDeductedAroundBase(...cells[a], '#',
            (xx, yy) => !areNeighbors(xx, yy, ...cells[b]));
        this.placeDeductedAroundBase(...cells[b], '*',
            (xx, yy) => !areNeighbors(xx, yy, ...cells[a]));
      }

    }
  }

  placeDeductedAround(x, y, val) {
    this.placeDeductedAroundBase(x, y, val, () => true);
  }

  placeDeductedAroundBase(x, y, val, test) {
    this.forEachNeighbor(x, y, (xx, yy) => {
      const oldVal = this.getXY(xx, yy);
      if (test(xx, yy) && (oldVal === 'B' || oldVal === 'N')) {
        if (oldVal !== (val === '*' ? 'B' : 'N'))
          console.log('This thing is buggy!', val, oldVal, xx, yy, x, y);
        const key = this.xyToKey(xx, yy);
        this.toDeduct.delete(key);
        this.deducted.add(key);
        this.setXY(xx, yy, val);
      }
    });
  }

  addToBoundaryAround(x, y) {
    this.forEachNeighborBase(x, y,
      (xx, yy) => this.isValidXY(xx, yy) &&
                  this.getXY(xx, yy) === '?',
      (xx, yy) => {
        this.numUnknowns--;
        this.setXY(xx, yy, '.');
        this.boundary.add(this.xyToKey(xx, yy));
      }
    );
  }

  countAllMinesAroundXY(x, y) {
    return this.countAroundXYBase(x, y, val => val === '*' || val === 'B');
  }

  countKnownMinesAroundXY(x, y) {
    return this.countAroundXYBase(x, y, val => val === '*');
  }

  countSpacesAroundXY(x, y) {
    return this.countAroundXYBase(x, y,
      val => val !== '*' && val !== '#' && !Number.isInteger(val));
  }

  countAroundXYBase(x, y, isCounted) {
    let count = 0;
    this.forEachNeighbor(x, y,
      (xx, yy) => {
        count += isCounted(this.getXY(xx, yy)) ? 1 : 0;
      });
    return count;
  }

  isValidXY(x, y) {
    return x >= 0 && y >= 0 && x < this.sx && y < this.sy;
  }

  neighbors(x, y) {
    return this.neighborsBase(x, y,
      (xx, yy) => this.isValidXY(xx, yy) && (xx !== x || yy !== y));
  }

  neighborsBase(x, y, validator) {
    let output = [];
    this.forEachNeighborBase(x, y, validator, (x, y) => output.push([x, y]));
    return output;
  }

  forEachNeighbor(x, y, func) {
    this.forEachNeighborBase(x, y,
      (xx, yy) => this.isValidXY(xx, yy) && (xx !== x || yy !== y),
      func);
  }

  forEachNeighborBase(x, y, validator, func) {
    this.forCellsInRingBase(x, y, 1, validator, func);
  }

  forCellsInRing(x, y, ring, func) {
    this.forCellsInRingBase(x, y, ring,
      (xx, yy) => this.isValidXY(xx, yy) && (xx !== x || yy !== y),
      func);
  }

  forCellsInRingBase(x, y, ring, validator, func) {
    for (let xx = x - ring; xx <= x + ring; ++xx) {
      for (let yy = y - ring; yy <= y + ring; ++yy) {
        if (validator(xx, yy))
          func(xx, yy);
      }
    }
  }

}

export default Minesweeper;
