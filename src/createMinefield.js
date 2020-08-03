import Minefield from './Minefield';
import XYSet from './XYSet';

// mineDecay indicates how many mines we remove from the target number.
// Every time we fail we double mineDecay.
// When we succeed we reset
const mineDecayBase = 1/256;

export function createLogicMinefield(sizeX, sizeY, startX, startY,
                                     numMines, revealCorners, rng) {
  if (revealCorners)
    console.log('Error! Cannot reveal corners in a logic minefield.');
  let mf;
  do {
    mf = new Minefield(sizeX, sizeY, rng);
    mf.start(startX, startY);
    let mineDecay = mineDecayBase;
    let iter = 0;
    while(iter < 500) {
      ++iter;
      while(mf.boundary.size > 0) {
        // If there are some unknowns, place 1 more mine so we have some
        // freedom towards the end.
        let mines = Math.max(0,
            numMines - Math.floor(mineDecay) +
            Math.min(10, Math.floor(mf.numUnknowns / 5)));
        if (mf.numUnknowns > 0) mines++;
        mf.placeMinesOnBoundary(mines);
        if(mf.boundary.size > 0)
          mineDecay = mineDecayBase;
      }
      if (mf.isComplete()) break;
      mf.backtrack();
      mineDecay *= 2;
    }
  } while (!mf.isComplete());
  return mf;
}

export function createRandomMinefield(sizeX, sizeY, startX, startY,
                                      numMines, revealCorners, rng) {
  const mf = new Minefield(sizeX, sizeY, rng);

  const setToIgnore = new XYSet(mf.grid);
  if (revealCorners) {
    setToIgnore.add(0, 0);
    setToIgnore.add(sizeX - 1, 0);
    setToIgnore.add(0, sizeY - 1);
    setToIgnore.add(sizeX - 1, sizeY - 1);
  }
  mf.grid.forCellsInRing(startX, startY, 1, (x, y) => setToIgnore.add(x, y));
  mf.placeMinesRandomly(numMines, setToIgnore);

  return mf;
}
