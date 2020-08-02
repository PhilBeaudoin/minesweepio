import Minefield from './Minefield';

// mineDecay indicates how many mines we remove from the target number.
// Every time we fail we double mineDecay.
// When we succeed we reset
const mineDecayBase = 1/256;

function createMinefield(sizeX, sizeY, startX, startY, numMines, rng) {
  const mf = new Minefield(sizeX, sizeY, rng);
  mf.start(startX, startY);

  let mineDecay = mineDecayBase;
  while(true) {
    while(mf.boundary.size > 0) {
      // If there are some unknowns, place 1 more mine so we have some
      // freedom towards the end.
      let mines = Math.max(0,
          numMines - Math.floor(mineDecay) + (mf.numUnknowns > 0 ? 1 : 0));
      if (mf.numUnknowns > 0) mines++;
      mf.placeMinesOnBoundary(mines);
      if(mf.boundary.size > 0)
        mineDecay = mineDecayBase;
    }
    if (mf.isComplete()) break;
    mf.backtrack();
    mineDecay *= 2;
  }

  console.log('Num mines = ', mf.numMines);
  return mf;
}

export default createMinefield;
