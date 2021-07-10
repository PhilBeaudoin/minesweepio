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

  computeAllDigits() {
    this.grid.forEachXYVal((x, y, val) => {
      if (val === '?')
        this.grid.setXY(x, y, this.countMinesAroundXY(x, y));
    });
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

    this.computeAllDigits();
  }

  placeMinesRandomly(totalMines, setToIgnore, currMines) {
    if (setToIgnore === undefined) setToIgnore = new XYSet(this.grid);
    if (currMines === undefined) currMines = new XYSet(this.grid);

    const options = new XYSet(this.grid);
    this.grid.forEachXYVal((x, y) => {
      if (!setToIgnore.has(x, y) && !currMines.has(x, y))
        options.add(x, y);
    });
    const mines = options.randomSubset(totalMines - currMines.size, this.rng);
    mines.addFromSet(currMines);
    this.placeMinesAndClearInitialField(mines, setToIgnore);
  }

  placeMinesPoisson(totalMines, setToIgnore) {
    // Select mine using a poisson process
    // The function has been determined experimentally to yield roughly the
    // right number of mines.
    const radius = Math.sqrt(this.grid.sx * this.grid.sy * 0.6 / totalMines);
    const options = new XYSet(this.grid);
    for (const p of poissonDiscSampler(this.grid.sx, this.grid.sy, radius,
                                       this.rng)) {
      const [x, y] = [Math.floor(p[0]), Math.floor(p[1])];
      if (!setToIgnore.has(x, y))
        options.addXY(x, y);
    }
    if (options.size >= totalMines) {
      console.log(`Got ${options.size} options for ${totalMines} mines.`);
      console.log(`Selecting random subset.`);
      const mines = options.randomSubset(totalMines, this.rng);
      this.placeMinesAndClearInitialField(mines, setToIgnore);
    } else {
      console.log(`Only ${options.size} options for ${totalMines} mines!`);
      console.log(`Adding more randomly.`);
      this.placeMinesRandomly(totalMines, setToIgnore, options);
    }
  }

  placeMinesEmptyZones(totalMines, areaToSeedRatio, setToIgnore) {
    const newSetToIgnore = new XYSet(this.grid);
    newSetToIgnore.addFromSet(setToIgnore);
    const area = this.grid.sx * this.grid.sy;
    while (area - newSetToIgnore.size > totalMines) {
      const options = new XYSet(this.grid);
      this.grid.forEachXYVal((x, y) => {
        if (!newSetToIgnore.has(x, y))
          options.add(x, y);
      });
      console.log('area - newSetToIgnore.size - totalMines: ', area - newSetToIgnore.size - totalMines);
      console.log(`Math.ceil(area / ${areaToSeedRatio}): `, Math.ceil(area / areaToSeedRatio));
      const seeds = options.randomSubset(
        Math.min(Math.ceil(area / areaToSeedRatio), area - newSetToIgnore.size - totalMines),
        this.rng);
      newSetToIgnore.addFromSet(seeds);
      const randArray = options.toXYShuffledArray(this.rng);
      for(let i = 0; i < randArray.length; ++i) {
        if (area - newSetToIgnore.size === totalMines)
          break;
        const [x, y] = randArray[i];
        this.grid.forEachNeighbor(x, y, (xx, yy) => {
          if (newSetToIgnore.hasXY(xx, yy))
            newSetToIgnore.addXY(x, y);
        });
      }
    }
    console.log('area - newSetToIgnore.size: ', area - newSetToIgnore.size);
    this.placeMinesRandomly(totalMines, newSetToIgnore)
  }

  placeMinesMicroZones(totalMines, setToIgnore) {
    this.placeMinesEmptyZones(totalMines, 2, setToIgnore)
  }

  placeMinesSmallZones(totalMines, setToIgnore) {
    this.placeMinesEmptyZones(totalMines, 5, setToIgnore)
  }

  placeMinesMediumZones(totalMines, setToIgnore) {
    this.placeMinesEmptyZones(totalMines, 10, setToIgnore)
  }

  placeMinesBigZones(totalMines, setToIgnore) {
    this.placeMinesEmptyZones(totalMines, 15, setToIgnore)
  }

  placeMinesScoringDigit(scorePerDigit, totalMines, setToIgnore) {
    const lockedSet = new XYSet(this.grid);
    lockedSet.addFromSet(setToIgnore);
    const area = this.grid.sx * this.grid.sy;

    let lastBestScore = 10000;
    let retries = 3;
    while(true) {
      this.clearDigits();
      const minesToPlace = totalMines - this.countMinesInSet(lockedSet);
      const remainingCells = area - lockedSet.size
      if (minesToPlace > remainingCells) {
        this.placeMinesRandomly(remainingCells, lockedSet);
        this.placeMinesRandomly(minesToPlace - remainingCells, setToIgnore);
        this.targetNumMines = totalMines;
        return;
      }
      this.placeMinesRandomly(minesToPlace, lockedSet);
      if (lastBestScore === 0) {
        if (retries === 0) {
          this.numMines = totalMines;
          return;
        }
        retries--;
      }
      this.computeAllDigits();
      // Generate 20 square groups of 9x9
      let bestCellSet;
      let bestScore = 0;
      for (let i = 0; i < 100; ++i) {
        const cellSet = this.grid.randomSquareRegion(this.rng, 4);
        cellSet.removeElementsOf(lockedSet);
        const score = this.computeScore(cellSet, scorePerDigit);
        if (score >= bestScore) {
          bestCellSet = cellSet;
          bestScore = score;
        }
      }
      lastBestScore = bestScore;
      bestCellSet.forEachXY((x, y) => {
        lockedSet.addXY(x, y);
        this.grid.forEachNeighbor(x, y, (xx, yy) => {
          lockedSet.addXY(xx, yy);
        });
      });
    }
  }

  placeMinesScoringDigitV2(scorePerDigit, totalMines, setToIgnore) {
    const scoreSum = scorePerDigit.reduce((a, b) => a + b, 0);
    const desiredScoreForDigit = scorePerDigit.map(a => a / scoreSum);

    const digitSets = [
      new XYSet(this.grid),
      new XYSet(this.grid),
      new XYSet(this.grid),
      new XYSet(this.grid),
      new XYSet(this.grid),
      new XYSet(this.grid),
      new XYSet(this.grid),
      new XYSet(this.grid),
      new XYSet(this.grid),
    ];

    const currentScoreForDigit = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const improvementByRemovingDigit = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    const computeCurrentScores = () => {
      digitSets.forEach((xySet, digit) => {
        currentScoreForDigit[digit] = xySet.size;
      });
      const currentScoreSum = currentScoreForDigit.reduce((a, b) => a + b, 0);
      currentScoreForDigit.forEach((score, digit) => {
        currentScoreForDigit[digit] /= currentScoreSum;
        improvementByRemovingDigit[digit] = currentScoreForDigit[digit] - desiredScoreForDigit[digit];
      });
    };

    this.computeAllDigits();
    this.grid.forEachXYVal((x, y, val) => {
      if (!setToIgnore.hasXY(x,y)) {
        const numVal = parseInt(val);
        if (!isNaN(numVal))
          digitSets[numVal].addXY(x, y);
      }
    });

    while(totalMines > 0) {
      computeCurrentScores();

      let bestDigitToIncrease = 0;
      let bestDigitScore = -1000000;
      for(let digit = 0; digit <= 7; ++digit) {
        const digitScore = improvementByRemovingDigit[digit] - improvementByRemovingDigit[digit + 1];
        if (digitScore > bestDigitScore && currentScoreForDigit[digit] > 0) {
          bestDigitToIncrease = digit;
          bestDigitScore = digitScore;
        }
      }
      let [x, y] = digitSets[bestDigitToIncrease].randomXY(this.rng);


      // Hack, start with the one we wanted to increase, in case we cant find a spot without a mine around it.
      let bestXToReplaceByAMine = x;
      let bestYToReplaceByAMine = y;
      let bestXYScore = -1000000;
      this.grid.forEachNeighbor(x, y, (xx, yy) => {
        const numVal = parseInt(this.grid.getXY(xx, yy));
        if (!isNaN(numVal) && !setToIgnore.hasXY(xx, yy)) {
          const xyScore = improvementByRemovingDigit[numVal];
          if (xyScore > bestXYScore || (xyScore === bestXYScore  && this.rng() > 0.5)) {
            bestXToReplaceByAMine = xx;
            bestYToReplaceByAMine = yy;
            bestXYScore = xyScore;
          }
        }
      });

      x = bestXToReplaceByAMine;
      y = bestYToReplaceByAMine;
      const replacedValue = parseInt(this.grid.getXY(x, y));
      if (isNaN(replacedValue)) {
        console.error('Internal error, unexpected non-digit value!');
      } else {
        digitSets[replacedValue].deleteXY(x, y);
        this.grid.setXY(x, y, '*');
        totalMines--;
        this.numMines++;
        // Increase everybody around that new mine
        this.grid.forEachNeighbor(x, y, (xx, yy) => {
          const numVal = parseInt(this.grid.getXY(xx, yy));
          if (!isNaN(numVal)) { 
            this.grid.setXY(xx, yy, numVal + 1);
            if (!setToIgnore.hasXY(xx, yy)) {
              digitSets[numVal].deleteXY(xx, yy);
              digitSets[numVal + 1].addXY(xx, yy);
            }
          }
        });
      }
    }
    this.clearDigits();
  }

  placeMinesNoBadPattern(totalMines, setToIgnore, placerFunction) {
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
    placerFunction(totalMines, setToIgnore);
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

  computeScore(cellSet, scorePerDigit) {
    let totalScore = 0;
    let totalDigits = 0;
    cellSet.forEachXY((x, y) => {
      const val = parseInt(this.grid.getXY(x, y));
      if (!isNaN(val)) {
        totalDigits += 1;
        totalScore += scorePerDigit[val];
      }
    });
    if (totalDigits === 0)
      return 0;
    return totalScore / totalDigits;
  }

  countMinesInSet(cellSet) {
    let count = 0;
    cellSet.forEachXY((x, y) => {
      if (this.grid.getXY(x, y) === '*')
        count++;
    });
    return count;
  }

  countMinesAroundXY(x, y) {
    return this.grid.countAroundXYIf(x, y, val => val === '*');
  }

  clearDigits() {
    this.grid.forEachXYVal((x, y, val) => {
      if (val !== '*')
        this.grid.setXY(x, y, '?');
    });
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
