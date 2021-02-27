const ALGO = {
  RANDOM: 0,
  ALWAYS_LOGICAL: 1,
  REDUCE_BADLUCK: 2,
  SPACED_OUT: 3,
  BIG_EMPTY_ZONES: 4,
  isValid: (algo) => Number.isInteger(algo) && algo >= 0 && algo <= 4
}

export default ALGO;
