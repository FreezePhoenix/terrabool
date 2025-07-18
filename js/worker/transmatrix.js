/*
|                                    ~ ~ TIME AND MEMORY ESTIMATES ~ ~                                      |
| outputs |            combinations            memory  | transition matrices    memory  |  time to compute  |
|    4    | C(15,4)  =               1 365    ≈ 5KB    |            840        ≈ 3KB    |    2ms            |
|    5    | C(31,5)  =             169 911    ≈ 663KB  |         83 328        ≈ 326KB  |    250ms          |
|    6    | C(63,6)  =          67 945 521    ≈ 259MB  |     27 998 208        ≈ 106MB  |    3 min          |
|    7    | C(127,7) =      94 525 795 200    ≈ 440GB  |                       ~ 180GB  |    est 3 days     |
|    8    | C(255,8) = 409 663 695 276 000    ≈ 2608TB |                       ~ 1043TB |    est 36 years   |

SOLUTION: prune linear combination set (what the getGoodTerms function does) at the possible cost of missing some matrices 
*/

import { Dictionary } from "../data/dictionary.js";

/**
 * tests if a number is a power of two
 * @param {number} x
 * @returns {boolean}
 */
function isPowerOfTwo(x) {
  return Math.log2(x) % 1 === 0;
}

/**
 * Tests if the matrix is invertible by checking the rows are linearly independent in GF(2).
 * @param {number[]} rows
 * @returns {boolean}
 */
function isInvertible(rows, pad = 2 ** rows.length) {
  for (let i = 3; i < pad; i++) {
    if (isPowerOfTwo(i)) continue; // skip a trivial combination
    let term = 0;
    let bitmask = 1;
    for (let j = 0; j < rows.length; j++) {
      if ((i & bitmask) != 0) term ^= rows[j];
      bitmask <<= 1;
    }
    if (rows.includes(term)) return false;
  }
  return true;
}

/**
 * Performs a GF(2) transition on a set of terms using a transition matrix.
 * @param {number[]} rows: The rows of the transition matrix
 * @param {number[]} terms: The terms to be transitioned
 * @returns {number[]} Transitioned terms
 */
function transition(rows, terms) {
  let newTerms = Array(terms.length).fill(0);

  for (let i = 0; i < terms.length; i++) {
    let bitmask = 1;
    for (let j = 0; j < terms.length; j++) {
      if ((rows[i] & bitmask) != 0) {
        newTerms[i] ^= terms[j];
      }
      bitmask <<= 1;
    }
  }
  return newTerms;
}

/**
 * We are tasked with transposing an array of numbers as if the bits formed a matrix.
 * We assume they are square, but that's fine for the uses we have.
 */
function transpose(arrayOfNums) {
  let result = [];
  for(let i = 0; i < arrayOfNums.length; i++) {
    let beginning = (arrayOfNums[0] >> i) & 1;
    for(let j = 1; j < arrayOfNums.length; j++) {
      beginning |= ((arrayOfNums[j] >> i) & 1) << j;
    }
    result[i] = beginning;
  }
  return result;
}

/**
 * @typedef {Map<number,number>} TermMap
 * @description Transitioned term as key, lamp count as value, ordered by lamp count
 */
/**
 * @typedef {number[]} viableCombinations
 * @description Array of solvable linear combinations, preserving order of TermMap
 */
/**
 * Generates all viable linear combinations (encodings) of input terms
 * @param {number[]} terms
 * @param {number} mask
 * @returns {[viableCombinations,TermMap]} Viable linear combinations array, and pruned map of terms.
 */
function getGoodTerms({ varCount, terms, mask = 0 }) {
  const masked_dictionary = Dictionary[varCount - 2].map((a) => [
    a[0] | mask,
    a[1],
  ]);
  let precursorTerms = [];

  // Test all linear combinations.
  for (let combination = 1; combination < 2 ** terms.length; combination++) {
    let bitmask = 0b1;
    let precursor = 0b0;

    for (let term of terms) {
      // Apply the term if the bit in its row is high.
      if ((combination & bitmask) != 0) {
        precursor ^= term;
      }
      bitmask <<= 1;
    }

    // Get the minimum lamp count of a gate that defines this term.
    const minimum = Math.min(
      ...masked_dictionary
        .filter((a) => a[0] == (precursor | mask))
        .map((a) => a[1])
    );

    // If the transitioned term is in the dictionary, add it to the viable combinations.
    if (minimum != Infinity) {
      precursorTerms.push({
        precursor: precursor,
        linearCombination: combination,
        lampCount: minimum,
      });
    }
  }
  precursorTerms.sort((a, b) => a.lampCount - b.lampCount);
  return {
    linearCombinations: precursorTerms.map((a) => a.linearCombination),
    goodTermsMap: new Map(
      precursorTerms.map((a) => [a.precursor, a.lampCount])
    ),
  };
}

/**
 * Generates all transition matrices for a given set of terms
 * @param {number[]} terms
 * @param {number} mask
 * @returns {number[][]} Partially sorted transition matrices
 */
function combinations({ varCount, terms, mask = 0, hardLimit = 20 }) {
  const { linearCombinations, goodTermsMap } = getGoodTerms({
    varCount: varCount,
    terms: terms,
    mask: mask,
  });
  let combination = new Array(terms.length).fill(0);
  const dim = goodTermsMap.size;
  let idx = 0;
  let BigRes = [];
  let tested = 0;
  while (idx >= 0) {
    if (combination[idx] >= dim) {
      idx--;
    } else if (idx === terms.length - 1) {
      const lin_combinations = combination.map((a) => linearCombinations[a]);

      // Check the matrix and add it to possible solutions list.
      if (isInvertible(lin_combinations)) {
        const transitioned = transition(lin_combinations, terms);
        const inverse = getInverseMatrix(lin_combinations);
        let rows = transpose(inverse);
        let new_transitioned = [];
        let transitionedMap = new Map();
        for(let i = 0; i < transitioned.length; i++) {
          let itransition = transitioned[i];
          if(transitionedMap.has(itransition)) {
            // We XOR instead of OR here, even though they *should* be identical, but just in case the system decides to use the same term twice for some reason.
            transitionedMap.set(itransition, transitionedMap.get(itransition) ^ rows[i]);
          } else {
            transitionedMap.set(itransition, rows[i]);
            new_transitioned.push(itransition);
          }
        }
        let new_rows = [];
        for(let i = 0; i < new_transitioned.length; i++) {
          new_rows.push(transitionedMap.get(new_transitioned[i]));
        }
        const lampSum = new_transitioned.reduce(
          (acc, term) => acc + goodTermsMap.get(term),
          0
        );
        BigRes.push({
          complexity: lampSum,
          rows: new_rows,
          transitioned: new_transitioned,
          mask: mask,
        });
      }
      tested++;
      postMessage({
        action: "count",
        count: `${BigRes.length}/${tested}`,
      });
      if (BigRes.length >= hardLimit) return BigRes.sort((a,b) => a.complexity-b.complexity);
    } else {
      idx++;
      combination[idx] = combination[idx - 1];
    }
    combination[idx]++;
  }
  return BigRes.sort((a,b) => a.complexity-b.complexity);
}

/**
 * Finds the inverse matrix of a transition matrix.
 * @param {number[]} lin_combinations Set of linear combinations
 * @returns {number[]} Inverse transition matrix
 */
function getInverseMatrix(lin_combinations) {
  let found = 0;
  let inverse = new Array(lin_combinations.length).fill(0);
  // Try all transformations per row.
  for (let i = 1; i < 2 ** lin_combinations.length; i++) {
    let term = 0;
    let bitmask = 1;

    // Apply transition.
    for (const combination of lin_combinations) {
      if ((i & bitmask) != 0) term ^= combination;
      bitmask <<= 1;
    }

    // If after transition the row has a single high bit, then that transition is part of the inverse matrix.
    if (isPowerOfTwo(term)) {
      inverse[Math.log2(term)] = i;
      found++;
      if (found == lin_combinations.length) break;
    }
  }
  return inverse;
}

onmessage = (e) => {
  switch (e.data.action) {
    case "generate":
      const matrices = combinations({
        varCount: e.data.varCount,
        terms: e.data.terms,
        mask: e.data.mask,
        hardLimit: e.data.hardLimit,
      });
      matrices.sort((a, b) => a.complexity - b.complexity);
      postMessage({
        action: "matrices",
        results: {
          varCount: e.data.varCount, 
          matrices,
          outputs: e.data.terms.length
        },
      });
      break;
    default:
      break;
  }
};
