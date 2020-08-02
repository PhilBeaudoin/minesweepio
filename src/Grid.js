import React, { useState, useEffect } from 'react';
import './Grid.css';
import XYSet from './XYSet';

function isRevealable(state) {
  return state === ' ' || state === '?';
}

function containsOnlyCell(cellList, x, y) {
  return cellList.length === 1 && cellList[0][0] === x && cellList[0][1] === y;
}

function Grid({minefield:mf, setNumFlags, getStateXY, setStateXY,
               setIsClicking, hasExploded, setHasExploded,
               isSuccess, setIsSuccess}) {

  const [revealedXYs, setRevealedXYs] = useState([]);
  const [capturedElem, setCapturedElem] = useState(null);
  const [isInside, setIsInside] = useState(false);
  const [numRevealed, setNumRevealed] = useState(0);

  function cellToPosX(x, y) {
    const state = getStateXY(x, y);
    if (state === ' ') {
      if (hasExploded)
        return mf.grid.getXY(x, y) === '*' ? '-96px' : '0px';
      else if (isSuccess)
        return mf.grid.getXY(x, y) === '*' ? '-32px' : '0px';
      else
        return '0px';
    }
    if (state === 'f') {
      if (hasExploded)
        return mf.grid.getXY(x, y) === '*' ? '-32px' : '-128px';
      else
        return '-32px';
    }
    if (state === '?') {
      if (hasExploded)
        return mf.grid.getXY(x, y) === '*' ? '-96px' : '-64px';
      else if (isSuccess)
        return mf.grid.getXY(x, y) === '*' ? '-32px' : '-64px';
      else
        return '-64px';
    }
    if (state === '-')
      return '-192px';
    if (state !== '.') {
      console.log('Error! User cell has undesirable value.');
      return '0px';
    }
    const val = mf.grid.getXY(x, y);
    if (val === '*')
      return '-160px';
    let digit = parseInt(val);
    if (Number.isNaN(digit) || digit < 0 || digit > 8) {
      //console.log('Error! Cell has neither a mine nor a valid digit.', val);
      if (val === '#') return '-64px';
      if (val === 'B') return '-96px';
      if (val === 'N') return '-128px';
      if (val === '.') return '-32px';
      return '0px';
    }
    return -(192 + 32 * digit) + 'px';
  }

  useEffect(() => {
    if (numRevealed === mf.grid.sx * mf.grid.sy - mf.numMines)
      setIsSuccess(true);
  }, [numRevealed, mf.grid.sx, mf.grid.sy, mf.numMines, setIsSuccess]);

  function revealAt(x, y, set) {
    if (getStateXY(x, y) === '.' || set.has(x, y)) return;
    setNumRevealed(num => num + 1);
    set.add(x, y);
    setStateXY(x, y, '.');
    const val = mf.grid.getXY(x, y);
    if (val === '*')
      setHasExploded(true);
    else if (val === 0)
      mf.grid.forEachNeighbor(x, y, (xx, yy) => revealAt(xx, yy, set));
  }

  function isEventInside(e, elem) {
    const rect = elem.getBoundingClientRect();
    return e.clientX >= rect.left && e.clientX <= rect.right &&
           e.clientY >= rect.top && e.clientY <= rect.bottom;
  }

  function pointerMove(x, y) {
    return (e) => {
      e.preventDefault();
      // Sometimes pointerDown gets eaten. Fix this by calling pointerDown
      // if we're moving with buttons down but nothing is captured.
      if (e.buttons !== 0 && capturedElem === null) pointerDown(x, y)(e);
      if (capturedElem !== e.target || hasExploded || isSuccess) return;
      const inside = isEventInside(e, e.target);
      if (revealedXYs.length > 0) {
        setIsClicking(inside);
        // Toggle the cells that will be revealed.
        if (inside !== isInside) {
          revealedXYs.forEach(xy =>
              setStateXY(...xy, inside ? '-' : ' '));
        }
      } else {
        // If both buttons are pressed and we're on a revealed digit,
        // start revealing the cells around it.
        if (e.buttons === 3 && getStateXY(x, y) === '.' &&
            Number.isInteger(mf.grid.getXY(x, y))) {
          mf.grid.forEachNeighbor(x, y, (xx, yy) => {
            if (isRevealable(getStateXY(xx, yy))) {
              setRevealedXYs(r => {r.push([xx, yy]); return r;});
              if (inside) {
                setIsClicking(true);
                setStateXY(xx, yy, '-');
              }
            }
          });
        }
      }
      setIsInside(inside);
    }
  }

  function pointerDown(x, y) {
    return (e) => {
      e.preventDefault();
      e.target.setPointerCapture(e.pointerId);
      setCapturedElem(e.target);

      if (hasExploded || isSuccess) return;

      const state = getStateXY(x, y);
      if (e.buttons === 1 && isRevealable(state)) {
        // Left button, reveal a mine if the mouse is released here.
        setIsClicking(true);
        setIsInside(true);
        setRevealedXYs([[x, y]]);
        setStateXY(x, y, '-');
      } else if (e.buttons === 2) {
        // Immediately cycle through [empty, flag, ?]
        const cycle = ' f?';
        const idx = cycle.indexOf(state);
        if (state === 'f') setNumFlags(num => num - 1);
        if (idx !== -1) setStateXY(x, y, cycle[(idx + 1)%3]);
        if (state === ' ') setNumFlags(num => num + 1);
      }
    }
  }

  function pointerUp(x, y) {
    return (e) => {
      e.preventDefault();
      e.target.releasePointerCapture(e.pointerId);
      setCapturedElem(null);
      setIsClicking(false);

      let reveal = false;
      if (isInside) {
        if (containsOnlyCell(revealedXYs, x, y)) {
          reveal = true;
        } else {
          // Revealing cells around the current cell.
          // Do it only if flag count matches.
          let flagCount = 0;
          mf.grid.forEachNeighbor(x, y, (xx, yy) => {
            if (getStateXY(xx, yy) === 'f') flagCount++;
          });
          reveal = flagCount === mf.grid.getXY(x, y);
        }
      }
      if (reveal) {
        const set = new XYSet(mf.grid);
        revealedXYs.forEach(xy => revealAt(...xy, set));
      } else {
        revealedXYs.forEach(xy => setStateXY(...xy, ' '));
      }
      setRevealedXYs([]);
      setIsInside(false);
    }
  }

  function renderCell(y) {
    return (state, x) => {
      return (<div key={x} className="Cell"
               style={{backgroundPositionX: cellToPosX(x, y)}}
               onPointerDown={pointerDown(x, y)}
               onPointerUp={pointerUp(x, y)}
               onPointerMove={pointerMove(x, y)}
               onContextMenu={(e) => {e.preventDefault();}}
               />);
    }
  }

  function renderRow(row, y) {
    return (<div key={y} className="Row">{row.map(renderCell(y))}</div>);
  }

  return (
    <div className="Grid">
      {mf.grid.rows.map(renderRow)}
    </div>
  );
}

export default Grid;
