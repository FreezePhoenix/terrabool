import { Terms } from "../data/terms.js";
import { Gates, negate } from "../data/gates.js";
import { Dictionary } from "../data/dictionary.js";
import { Queue } from "../model/Queue.js";

/**
 * Creates the lookup table from dictionary.js
 * @param {Array.<string, number, number> terms: The dictionary of terms.
 * @param {number} varCount: number of variables (2 to 4)
 * @param {Object} val: An object describing the current term being investigated.
 * @param {number} count: the number of terms in the expression
 * @param {Array.<{number, number}>} solutions: array of [boolean function, min depth to solve]
 */
const testfunc = (terms, varCount, val, count, solutions) => {
  for (let gate of Gates) {
    let term = gate.combine(terms, val, varCount);
    solutions[term] = solutions[term]
      ? [term, Math.min(solutions[term][1], count)]
      : [term, count];
    term = negate(term, varCount);
    solutions[term] = solutions[term]
      ? [term, Math.min(solutions[term][1], count)]
      : [term, count];
  }
};

/**
 * Default validation function. Pushes valid text based expressions to the solutions array.
 * @param {Array.<string, number, number>} terms: The dictionary of terms.
 * @param {Object} val: An object describing the current term being investigated.
 * @param {number} count: the number of terms in the expression
 * @param {Array.<{string, number[]}>} solutions: array of [representative string, list of wire lamp configurations]
 * @param {number} term: The desired term to reach
 * @param {number} neg_term: The complement of the desired term to reach, in case we can reach it using a negated output
 * @param {number} mask: a mask taking care of don't cares
 */
const identity = (terms, val, count, solutions, term, neg_term, mask) => {
  let vterm = terms[val.idx];
  if (count === 1) {
    for (let gate of Gates) {
      gate.combine(terms, val);
    }
    if ((vterm[1] | mask) == term) {
      solutions.push([vterm[0], vterm[2]]);
    }
  } else {
    for (let gate of Gates) {
      const t = gate.combine(terms, val);
      const t_m = t | mask;
      if (t_m == term || t_m == neg_term) {
        let symbol_string = vterm[0];
        let current = val.prev;
        let wire_lamps = new Array(count);
        let index = count;
        
        do {
          let cterm = terms[current.idx];
          symbol_string = cterm[0] + ", " + symbol_string;
          wire_lamps[--index] = cterm[2];
          current = current.prev;
        } while(current != null);
        
        // valid expression found. add it to solutions
        solutions.push([
          t_m == term ? `${gate.symbol}(${symbol_string})` : `¬${gate.symbol}(${symbol_string})`,
          wire_lamps,
        ]);
      }
    }
  }
};


/**
 * Generates all possible expressions for a given term, combinations generated in breadth-first-like order.
 * @param {number} varCount: number of variables (2 to 4)
 * @param {number} maxDepth: maximum depth of the expression. i.e. the maximum number of terms
 * @param {number} term: the term to be expressed
 * @param {number} mask: a mask taking care of don't cares
 * @param {requestCallback} callback: a callback function, which should validate the expression and add it to the solutions array
 * @returns {any[]} Formatted results
 */
function makeExpressionsBFS({
  varCount,
  maxDepth,
  term,
  mask,
  callback = identity,
}) {
  const neg_term = negate(term ^ mask, varCount) | mask; 
  const legalTerms = Terms[varCount];
  
  // Initialize the queue with the individual terms.
  let queue = new Queue();
  let next_queue = new Queue();
  
  for(let i = 0; i < legalTerms.length; i++) {
    next_queue.enqueue({
      XOR_CACHE_O: 0,
      XOR_CACHE_E: 0,
      AND_CACHE: 0,
      prev: null,
      next: null,
      idx: i,
    });
  }
  
  let solutions = [];
  let count = 0;
  
  while(!next_queue.empty()) {
    let temp = next_queue;
    next_queue = queue;
    queue = temp;
    
    count++;
    
    while (!queue.empty()) {
      let val = queue.dequeue();
      callback(legalTerms, val, count, solutions, term, neg_term, mask);
      if (count < maxDepth) {
        for (let i = val.idx + 1; i < legalTerms.length; i++) {
          next_queue.enqueue({ 
            XOR_CACHE_O: 0,
            XOR_CACHE_E: 0,
            AND_CACHE: 0,
            prev: val,
            next: null,
            idx: i,
          });
        }
      }
    }
  }

  return solutions.length > 0 ? solutions : undefined;
}

onmessage = (e) => {
  switch (e.data.action) {
    case "search":
      const maskedDictionary = Dictionary[e.data.varCount - 2].map((a) => [
        a[0] | e.data.mask,
        a[1],
      ]);

      if (maskedDictionary.find((a) => a[0] == e.data.term)) {
        const results = makeExpressionsBFS({
          varCount: e.data.varCount,
          maxDepth: e.data.maxDepth,
          term: e.data.term,
          mask: e.data.mask,
        });
        postMessage({ action: "result", results: results });
      } else {
        // Preprocessing...
        let maskedDictionaryMap = new Map();
        for(let i = 0; i < maskedDictionary.length; i++) {
          let [term, complexity] = maskedDictionary[i];
          if(maskedDictionaryMap.has(term)) {
            if(complexity < maskedDictionaryMap.get(term)) {
              maskedDictionaryMap.set(term, complexity);
            }
          } else {
            maskedDictionaryMap.set(term, complexity);
          }
        }
        // find the two terms of the shortest combined complexity that, when XOR'ed together, give the searched term
        let pair = [],
          min = Infinity;
        for (let i = 0; i < maskedDictionary.length; i++) {
          let term0 = maskedDictionary[i];
          let complementary = (e.data.term ^ term0[0]) | e.data.mask;
          if(maskedDictionaryMap.has(complementary)) {
            let term1Complexity = maskedDictionaryMap.get(complementary);
            if (term1Complexity + term0[1] < min) {
              pair = [complementary, term0[0]];
              min = term1Complexity + term0[1];
            }
          }
        }

        const results1 = makeExpressionsBFS({
          varCount: e.data.varCount,
          maxDepth: e.data.maxDepth,
          term: pair[0],
          mask: e.data.mask,
        });
        const results2 = makeExpressionsBFS({
          varCount: e.data.varCount,
          maxDepth: e.data.maxDepth,
          term: pair[1],
          mask: e.data.mask,
        });

        postMessage({
          action: "double",
          results1: results1,
          results2: results2,
        });
      }
      break;
    case "test": {
      const results = makeExpressionsBFS({
        varCount: e.data.varCount,
        maxDepth: e.data.maxDepth,
        term: 0,
        mask: 0,
        callback: testfunc,
      });

      postMessage({
        action: "test",
        results: results,
      });
      break;
    }
  }
};
