const ALGO = {
  RANDOM: 0,
  ALWAYS_LOGICAL: 1,
  REDUCE_BADLUCK: 2,
  SPACED_OUT: 3,
  SMALL_EMPTY_ZONES: 4,
  MEDIUM_EMPTY_ZONES: 5,
  BIG_EMPTY_ZONES: 6,
  LOTS_OF_SIX: 7,
  LOTS_OF_SEVEN: 8,
  FAVOR_SMALL: 9,
  isValid: (algo) => Number.isInteger(algo) && algo >= 0 && algo <= 9
}

export default ALGO;
