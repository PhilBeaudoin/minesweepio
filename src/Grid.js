import React, {useState} from 'react';
import './Grid.css';

function cellToPosX(hasExploded, cell) {
  if (cell[1] === ' ') {
    if (hasExploded)
      return cell[0] === '*' ? -96 : 0;
    else
      return 0;
  }
  if (cell[1] === 'f') {
    if (hasExploded)
      return cell[0] === '*' ? -32 : -128;
    else
      return -32;
  }
  if (cell[1] === '?')
    return -64;
  if (cell[1] === '-')
    return -192;
  if (cell[1] !== '.') {
    console.log('Error! User cell has undesirable value.');
    return 0;
  }
  if (cell[0] === '*')
    return -160;
  let digit = parseInt(cell[0]);
  if (Number.isNaN(digit) || digit < 0 || digit > 8) {
    console.log('Error! Cell has neither a mine nor a valid digit.', cell[0]);
    return 0;
  }
  return -(192 + 32 * digit);
}

function Grid(props) {
  const ms = props.minesweeper;
  const grid = ms.combinedGrid();

  const [revealedXYs, setRevealedXYs] = useState([]);
  const [capturedElem, setCapturedElem] = useState(null);
  const [isInside, setIsInside] = useState(false);

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
      if (capturedElem !== e.target || ms.hasExploded()) return;
      const inside = isEventInside(e, e.target);
      if (revealedXYs.length > 0) {
        // Toggle the cells that will be revealed.
        if (inside !== isInside) {
          revealedXYs.forEach(xy => ms.setUserXY(...xy, inside ? '-' : ' '));
        }
      } else {
        // If both buttons are pressed and we're on a revealed digit,
        // start revealing the cells around it.
        if (e.buttons === 3 && ms.getUserXY(x, y) === '.' &&
            Number.isInteger(ms.getXY(x, y))) {
          ms.forEachNeighbor(x, y, (xx, yy) => {
            const userVal = ms.getUserXY(xx, yy);
            if (userVal === ' ' || userVal === '?') {
              setRevealedXYs(r => {r.push([xx, yy]); return r;});
              if (inside) ms.setUserXY(xx, yy, '-');
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

      if (ms.hasExploded()) return;

      const userVal = ms.getUserXY(x, y);
      if (e.buttons === 1 && (userVal === ' ' || userVal === '?')) {
        // Left button, reveal a mine if the mouse is released here.
        setIsInside(true);
        setRevealedXYs([[x, y]]);
        ms.setUserXY(x, y, '-');
      } else if (e.buttons === 2 &&
                 (userVal === ' ' || userVal === 'f' || userVal === '?')) {
        // Right button, cycle through flags and ?
        if (userVal === ' ') ms.setUserXY(x, y, 'f');
        else if (userVal === 'f') ms.setUserXY(x, y, '?');
        else if (userVal === '?') ms.setUserXY(x, y, ' ');
        return;
      }
    }
  }

  function pointerUp(x, y) {
    return (e) => {
      e.preventDefault();
      e.target.releasePointerCapture(e.pointerId);
      setCapturedElem(null);

      let reveal = false;
      if (isInside) {
        if (revealedXYs.length === 1 &&
            revealedXYs[0][0] === x && revealedXYs[0][1] === y) {
          // Revealing the current cell.
          reveal = true;
        } else {
          // Revealing cells around the current cell. Do it only if flag count
          // matches.
          let flagCount = 0;
          ms.forEachNeighbor(x, y, (xx, yy) => {
            if (ms.getUserXY(xx, yy) === 'f') flagCount++;
          });
          reveal = flagCount === ms.getXY(x, y);
        }
      }
      if (reveal)
        revealedXYs.forEach(xy => ms.revealAt(...xy));
      else
        revealedXYs.forEach(xy => ms.setUserXY(...xy, ' '));
      setRevealedXYs([]);
      setIsInside(false);
    }
  }

  function renderCell(y) {
    return (cell, x) => {
      return (<div key={x} className="Cell"
               style={{backgroundPositionX:
                              cellToPosX(ms.hasExploded(), cell) + 'px'}}
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
      {grid.map(renderRow)}
    </div>
  );
}

export default Grid;
