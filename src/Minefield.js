import { sharedGroup, areNeighbors } from './utils';
import Grid2d from './Grid2d'
import XYSet from './XYSet'

class Minefield {
  constructor(sx, sy, rng) {
    this.grid = new Grid2d(sx, sy, '?');
    this.numUnknowns = sx * sy;
    this.rng = rng === undefined ? Math.random : rng;
    this.numMines = 0;
    this.boundary = new XYSet(this.grid);
    this.toDeduct = new XYSet(this.grid);
    this.deducted = new XYSet(this.grid);
  }

  isComplete() {
    return this.numUnknowns === 0 && this.boundary.size === 0 &&
           this.toDeduct.size === 0 && this.deducted.size === 0;
  }

  start(x, y) {
    this.numUnknowns--;
    this.grid.setXY(x, y, 0);
    this.grid.forEachNeighbor(x, y, (xx, yy) => {
      this.numUnknowns--;
      this.grid.setXY(xx, yy, '#');
      this.deducted.add(this.grid.toKey(xx, yy));
    });
    this.deducted.forEachXY((x, y) => this.addToBoundaryAround(x, y));
  }

  // Count every cell that has a value in vals, which is an array of element.
  countVals(vals) {
    let count = 0;
    this.grid.forEach(val => count += (vals.indexOf(val) === -1 ? 0 : 1));
    return count;
  }

  fillUnknownsWithEmpty() {
    this.grid.forEachXYVal((x, y, val) => {
      if(val === '?') {
        this.grid.setXY(x, y, this.countAllMinesAroundXY(x, y));
        this.numUnknowns--;
      }
    });
  }

  fillUnknownsWithMines() {
    this.grid.forEachXYVal((x, y, val) => {
      if(val === '?') {
        this.grid.setXY(x, y, '*');
        this.numUnknowns--;
        this.numMines++;
      }
    });
  }

  placeMinesOnBoundary(totalMines) {
    // First place mines along the boundary
    const numMines = Math.max(0, Math.round((totalMines - this.numMines) *
                this.boundary.size / (this.numUnknowns + this.boundary.size)));
    const mineSet = this.boundary.randomSubset(numMines, this.rng);
    this.boundary.forEachXYKey((x, y, key) => {
      this.toDeduct.add(key);
      if (mineSet.has(key)) {
        this.grid.setXY(x, y, 'B');
        this.numMines++;
      } else {
        this.grid.setXY(x, y, 'N');
      }
    });

    // Then fill all the deducted numbers
    this.deducted.forEachXY((x, y) => {
      if (this.grid.getXY(x, y) === '#')
        this.grid.setXY(x, y, this.countAllMinesAroundXY(x, y));
    });
    this.deducted.clear();

    this.doDeductions();
    this.extendBoundary();
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
    const visited = new XYSet(this.grid);
    const frontier = [];

    const maybeAddToFrontier = (x, y) => {
      if (!visited.has(x, y)) {
        visited.add(x, y);
        frontier.push([x, y]);
      }
    }

    const visit = (x, y) => {
      const val = this.grid.getXY(x, y);
      if (val === '?') this.grid.forEachNeighbor(x, y, maybeAddToFrontier);
      return val;
    }

    this.grid.forEachXYVal((x, y, val) => {
      if (val === '?') maybeAddToFrontier(x, y);
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
          this.grid.setXY(...xy, 'B');
          this.toDeduct.add(...xy);
        });
      }
    });
  }

  clearDeducted() {
    let toDeductAgain = new XYSet(this.grid);
    this.toDeduct.forEachXY((x, y) => {
      const val = this.grid.getXY(x, y);
      if (val === 'B') this.numMines--;
      this.grid.setXY(x, y, '?');
      this.numUnknowns++;

      this.grid.forEachNeighbor(x, y, (xx, yy) => {
        const val = this.grid.getXY(xx, yy);
        if (Number.isInteger(val)) {
          toDeductAgain.add(xx, yy);
          this.grid.setXY(xx, yy, 'N');
        } else if (val === '*') {
          toDeductAgain.add(xx, yy);
          this.grid.setXY(xx, yy, 'B');
        }
      });
    });
    this.toDeduct = toDeductAgain;
  }

  extendBoundary() {
    // Extend the boundary around each deducted number
    this.boundary.clear();
    let deductedNext = new XYSet(this.grid);
    this.deducted.forEachXYKey((x, y, key) => {
      this.toDeduct.delete(key);
      if (this.grid.getXY(x, y) === '#') {
        if (this.countSpacesAroundXY(x, y) === 0) {
          this.grid.setXY(x, y, this.countAllMinesAroundXY(x, y));
        } else {
          this.addToBoundaryAround(x, y);
          deductedNext.add(key);
        }
      }
    });
    this.deducted = deductedNext;
  }

  addToBoundaryAround(x, y) {
    this.grid.forEachNeighborValidate(x, y,
      (xx, yy) => this.grid.getXY(xx, yy) === '?',
      (xx, yy) => {
        this.numUnknowns--;
        this.grid.setXY(xx, yy, '.');
        this.boundary.add(xx, yy);
      }
    );
  }

  ///////////////////////////////////////////////////////////////////////
  // Deduction methods.

  getClues() {
    let clues = new XYSet(this.grid);
    this.toDeduct.forEachXY((x, y) => {
      this.grid.forEachNeighbor(x, y, (xx, yy) => {
        if(Number.isInteger(this.grid.getXY(xx, yy))) clues.add(xx, yy)
      });
    });
    return clues;
  }

  fillCountAt(counts, x, y) {
    const val = this.grid.getXY(x, y);
    const count = counts.getXY(x, y);
    if (count.remainingMines === -1)
      count.remainingMines = val - this.countKnownMinesAroundXY(x, y);
    if (count.remainingSpaces === -1)
      count.remainingSpaces = this.countSpacesAroundXY(x, y);
  }

  calcCounts(clues) {
    const counts = new Grid2d(this.grid.sx, this.grid.sy, {
      remainingMines: -1,
      remainingSpaces: -1
    });
    clues.forEachXY((x, y) => this.fillCountAt(counts, x, y));
    return counts;
  }

  doDeductions() {
    // Then try to deduct all the cells
    let clues = this.getClues();
    let prevSize = -1;
    while (prevSize !== this.deducted.size) {
      const counts = this.calcCounts(clues);
      prevSize = this.deducted.size;
      clues.forEachXY((x, y) => this.deductAround(counts, x, y));
      if (prevSize === this.deducted.size) {
        // Did not manage to deduct anything, do the more complex ones.
        clues.forEachXYKey((x, y, key1) => {
          this.grid.forCellsInRing(x, y, 2, (xx, yy) => {
            const key2 = this.grid.toKey(xx, yy);
            if (key1 < key2 && clues.has(key2))
              this.deductForPair(counts, x, y, xx, yy);
          });
        });
      }
    }
  }

  deductAround(counts, x, y) {
    const count = counts.getXY(x, y);
    if (count.remainingMines === 0)
      this.placeDeductedAround(x, y, '#');
    else if (count.remainingMines === count.remainingSpaces)
      this.placeDeductedAround(x, y, '*');
  }

  deductForPair(allCounts, x1, y1, x2, y2) {
    let cells = [[x1, y1], [x2, y2]];
    let counts = cells.map(xy => allCounts.getXY(...xy));
    const sharedCells = sharedGroup(x1, y1, x2, y2).filter((xy) => {
      if (!this.grid.isValidXY(...xy)) return false;
      const val = this.grid.getXY(...xy);
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
        this.placeDeductedAroundIf(...cells[a], '#',
            (xx, yy) => !areNeighbors(xx, yy, ...cells[b]));
        this.placeDeductedAroundIf(...cells[b], '*',
            (xx, yy) => !areNeighbors(xx, yy, ...cells[a]));
      }
    }
  }

  placeDeductedAround(x, y, val) {
    this.placeDeductedAroundIf(x, y, val, () => true);
  }

  placeDeductedAroundIf(x, y, val, test) {
    this.grid.forEachNeighbor(x, y, (xx, yy) => {
      const oldVal = this.grid.getXY(xx, yy);
      if ((oldVal === 'B' || oldVal === 'N') && test(xx, yy)) {
        if (oldVal !== (val === '*' ? 'B' : 'N'))
          console.log('This thing is buggy!', val, oldVal, xx, yy, x, y);
        this.toDeduct.delete(xx, yy);
        this.deducted.add(xx, yy);
        this.grid.setXY(xx, yy, val);
      }
    });
  }

  countAllMinesAroundXY(x, y) {
    return this.grid.countAroundXYIf(x, y, val => val === '*' || val === 'B');
  }

  countKnownMinesAroundXY(x, y) {
    return this.grid.countAroundXYIf(x, y, val => val === '*');
  }

  countSpacesAroundXY(x, y) {
    return this.grid.countAroundXYIf(x, y,
      val => val !== '*' && val !== '#' && !Number.isInteger(val));
  }
}

export default Minefield;
