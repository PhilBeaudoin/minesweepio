import Minesweeper from './Minesweeper';

function createMinesweeper(sizeX, sizeY, numMines) {
  const startX = Math.floor(sizeX / 2);
  const startY = Math.floor(sizeY / 2);

  const maxRetries = numMines;
  const maxIter = 1000;
  let retries = 0;
  const ms = new Minesweeper(sizeX, sizeY);
  ms.start(startX, startY);
  let iter = 0;
  const stack = [0];
  while(!ms.isComplete() && iter < maxIter) {
    iter++;
    retries = stack.pop();
    while (retries === maxRetries) {
      retries = stack.pop();
      ms.backtrack();
    }

    let success = false;
    while(ms.boundary.size > 0) {
      ms.placeMinesOnBoundary(numMines - retries);
      if(ms.boundary.size > 0)
        success = true;
    }
    stack.push(retries + 1);
    if (success)
      stack.push(1);
    ms.backtrack();
  }

  if (!ms.isComplete()) {
    console.log('Was not able to complete the minesweeper!')
    console.log('toDeduct.size', ms.toDeduct.size);
    console.log('deducted.size', ms.deducted.size);
    console.log('boundary.size', ms.boundary.size);
    console.log('numUnknowns', ms.numUnknowns);
    console.log('boundary.size', ms.isComplete());
  }
  console.log('iter =', iter);
  console.log('Num mines = ', ms.numMines);

  ms.revealAt(startX, startY);
  return ms;
}

export default createMinesweeper;
