import React from 'react';
import PropTypes from 'prop-types';
import './DigitBox.css';

function getPosX(val, digitPos) {
  if (val < 0) val = 0;
  if (digitPos > 1 && val < digitPos) return '0px';
  const digit = Math.floor(val / digitPos) % 10;
  return -(26 + digit * 26) + 'px';
}

function DigitBox({ value, numDigits }) {

  const digits = Array(numDigits);
  let digitPos = Math.pow(10, numDigits - 1);
  for (let i = 0; i < numDigits; ++i) {
    digits[i] = (<div key={i} className='Digit'
                    style={{backgroundPositionX: getPosX(value, digitPos)}} />);
    digitPos /= 10;
  }

  return (<div className='DigitBox'>{digits}</div>);
}

DigitBox.propTypes = {
  value: PropTypes.number.isRequired,
  numDigits: PropTypes.number.isRequired
};

export default DigitBox;