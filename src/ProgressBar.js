import React from 'react';
import PropTypes from 'prop-types';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';
import './ProgressBar.css';

function ProgressBar({ open, percent }) {
  return (
    <Dialog open={open}
            disableBackdropClick >
      <DialogTitle className='Unselectable'>Constructing...</DialogTitle>
      <div className='BarContainer'>
        <div className='Bar'
             style={{width: Math.round(percent * 100) + '%'}} />
      </div>
    </Dialog>
  );
}

ProgressBar.propTypes = {
  open: PropTypes.bool.isRequired,
  percent: PropTypes.number.isRequired,
};

export default ProgressBar;