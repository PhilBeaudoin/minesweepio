import { sharedGroup, areNeighbors } from './utils';
import Grid2d from './Grid2d'
import XYSet from './XYSet'

class Solver {
  constructor(mf, startX, startY, minProb) {
    this.mf = mf;
    this.grid = null;
    this.numDeducted = 0;
    this.cachedDeductions = [];
    this.startX = startX;
    this.startY = startY;
    this.minProb = minProb === undefined ? 0 : minProb;
  }

  start() {
    if (!Number.isInteger(this.mf.grid.getXY(this.startX, this.startY))) {
      console.log('Error! Must start solving around a digit.');
      return;
    }

    this.grid = new Grid2d(this.mf.grid.sx, this.mf.grid.sy, {
      deducted: false,
      remainingUnknowns: -1,
      unknownMines: -1
    });
    this.numDeducted = 0;

    let clues = new XYSet(this.grid);
    this.setDeductedAt(this.startX, this.startY, clues);

    const oldDeductions = [...this.cachedDeductions];
    this.cachedDeductions = [];
    oldDeductions.forEach(func => func(clues));

    let prevNumDeducted = -1;
    while (prevNumDeducted !== this.numDeducted) {
      prevNumDeducted = this.numDeducted;

      // Stop as soon as we manage to deduct around a given clue, because
      // the clues may have changed. We'll do other deductions next time
      // around.
      // TODO: As an optimization, we may want to start from a random
      //       index every time we iterate, otherwise we risk going over
      //       useless clues at the beginning of the set again and again...
      let entries = clues.entriesXY();
      for (const xy of entries) {
        this.tryToDeductAround(...xy, clues)
        if (prevNumDeducted !== this.numDeducted) break;
      }

      // If we did not manage to deduc anything, do more complex deductions.
      if (prevNumDeducted === this.numDeducted) {
        entries = clues.entriesXY();
        for (const xy of entries) {
          const key1 = this.grid.toKey(...xy);
          this.grid.forCellsInRing(...xy, 2, (xx, yy) => {
            const key2 = this.grid.toKey(xx, yy);
            if (key1 < key2 && clues.has(key2))
              this.tryToDeductForPair(...xy, xx, yy, clues);
          });
          if (prevNumDeducted !== this.numDeducted) break;
        }
      }

      if (prevNumDeducted === this.numDeducted) {
        entries = clues.entriesXY();
        for (const xy of entries) {
          this.tryToDeductProb(...xy, clues)
          if (prevNumDeducted !== this.numDeducted) break;
        }
      }
    }
  }

  tryToDeductAround(x, y, clues) {
    const val = this.grid.getXY(x, y);
    if (!val.deducted) {
      return;
    }
    if (val.unknownMines === 0 ||
        val.unknownMines === val.remainingUnknowns ||
        val.unknownMines / val.remainingUnknowns < this.minProb) {
      this.cachedDeductions.push(this.tryToDeductAround.bind(this, x, y));
      this.setDeductedAround(x, y, clues);
    }
  }

  tryToDeductForPair(x1, y1, x2, y2, clues) {
    let cells = [[x1, y1], [x2, y2]];
    let counts = cells.map(xy => this.grid.getXY(...xy));
    if (!counts[0].deducted || !counts[1].deducted) return;

    // Keep only the cell shared by the two cells in the pair that are not yet
    // deducted.
    const sharedCells = sharedGroup(x1, y1, x2, y2).filter((xy) => {
      if (!this.grid.isValidXY(...xy)) return false;
      return !this.grid.getXY(...xy).deducted;
    });
    const numSharedCells = sharedCells.length;

    let success = false;
    for (let i = 0; i < 2; ++i) {
      // If Cell A has N remaining mines
      // and it has K empty cells shared with Cell B
      // and Cell B has S remaining unknowns around it
      // and Cell B has S-K+N remaining mines
      // THEN
      //   All the non-shared unknowns around cell A are '#'
      //   All the non-shared unknowns around cell B are '*'
      success = true;
      let [a, b] = [i, 1-i];
      if (counts[b].unknownMines === counts[b].remainingUnknowns -
              numSharedCells + counts[a].unknownMines) {
        this.setDeductedAroundIf(...cells[a],
            (xx, yy) => !areNeighbors(xx, yy, ...cells[b]), clues);
        this.setDeductedAroundIf(...cells[b],
            (xx, yy) => !areNeighbors(xx, yy, ...cells[a]), clues);
      }
    }
    if (success) {
      this.cachedDeductions.push(
          this.tryToDeductForPair.bind(this, x1, y1, x2, y2));
    }
  }

  tryToDeductProb(x, y, clues) {
    const val = this.grid.getXY(x, y);
    if (this.minProb === 0 || !val.deducted) {
      return;
    }
    if (val.unknownMines / val.remainingUnknowns < this.minProb) {
      let chosen = {x: 0, y: 0, mvVal:-1};
      this.grid.forEachNeighbor(x, y, (xx, yy) => {
        const mfVal = this.mf.grid.get(x, y);
        if (Number.isInteger(mfVal) && mfVal > chosen.mfVal) {
          chosen = {x: xx, y: yy, mfVal};
        }
      });
      this.setDeductedAround(chosen.x, chosen.y, clues);
    }
  }

  setDeductedAround(x, y, clues) {
    this.grid.forEachNeighbor(x, y,
      (xx, yy) => this.setDeductedAt(xx, yy, clues));
  }

  setDeductedAroundIf(x, y, test, clues) {
    this.grid.forEachNeighbor(x, y,
      (xx, yy) => { if (test(xx, yy)) this.setDeductedAt(xx, yy, clues) });
  }

  setDeductedAt(x, y, clues) {
    // 1) Mark this cell as deducted
    // 2) Calculate its counts
    // 3) Update the counts of any cell around it
    // 4) Remove from clues any cell that has no remaining unknowns
    // 5) Add this cell to clues if it has remaining unknowns
    const val = this.grid.getXY(x, y);
    if (val.deducted) return;
    this.numDeducted++;
    const mfVal = this.mf.grid.getXY(x, y);
    const isMine = mfVal === '*';
    val.deducted = true;
    val.remainingUnknowns = 0;
    val.unknownMines = !Number.isInteger(mfVal) ? -1 : mfVal;
    this.grid.forEachNeighbor(x, y, (xx, yy) => {
      const otherVal = this.grid.getXY(xx, yy);
      if (!otherVal.deducted) {
        val.remainingUnknowns++;
      } else {
        if (this.mf.grid.getXY(xx, yy) === '*')
          val.unknownMines--;

        // Update neighbor's count
        otherVal.remainingUnknowns--;
        otherVal.unknownMines -= isMine ? 1 : 0;

        if (otherVal.remainingUnknowns === 0)
          clues.delete(xx, yy);
      }
    });
    if (!isMine && val.remainingUnknowns > 0) clues.add(x, y);
  }

  setNotDeductedAt(x, y) {
    // TODO: This should invalidate a bunch of things.
    //       Now it's not too bad because we call start() again, but we
    //       should add a check.
    this.numDeducted--;
    this.grid.getXY(x, y).deducted = false;
  }
}

export default Solver;