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
const identity = (terms, val, count, solutions, term, neg_term, mask, symbols) => {
  let vterm = terms[val.idx];
  if (count === 1) {
    for(let i = 0; i < Gates.length; i++) {
      let gate = Gates[i];
      gate.combine(val, vterm);
    }
    if (vterm == term) {
      solutions.push([symbols[val.idx][0], [symbols[val.idx][1]]]);
    }
  } else {
    for(let i = 0; i < Gates.length; i++) {
      let gate = Gates[i];
      const t = gate.combine(val, vterm);
      const t_m = t;
      if (t_m == term || t_m == neg_term) {
        let symbol_string = symbols[val.idx][0];
        let current = val.prev;
        let wire_lamps = new Array(count);
        let index = count;
        wire_lamps[--index] = symbols[val.idx][1];
        do {
          let cterm = symbols[current.idx];
          symbol_string = cterm[0] + ", " + symbol_string;
          wire_lamps[--index] = cterm[1];
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
  let legalTerms = Terms[varCount];
  let neg_term;
  let symbols;
  if(callback == identity) {
    neg_term = negate(term, varCount); 
    term = term ^ mask;
    symbols = legalTerms.map(term => [term[0], term[2]]);
    legalTerms = legalTerms.map(term => term[1] & ~mask);
  }
  // Initialize the queue with the individual terms.
  let queue = new Queue();
  let next_queue = new Queue();
  
  for(let i = 0; i < legalTerms.length; i++) {
    next_queue.enqueue({
      CACHE_0: 0,
      CACHE_1: 0,
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
      callback(legalTerms, val, count, solutions, term, neg_term, mask, symbols);
      if (count < maxDepth) {
        if((val.CACHE_1 & term) && (val.CACHE_1 & neg_term)) {
            continue;
        }
        for (let i = val.idx + 1; i < legalTerms.length; i++) {
          next_queue.enqueue({ 
            CACHE_0: 0,
            CACHE_1: 0,
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

      let results = makeExpressionsBFS({
        varCount: e.data.varCount,
        maxDepth: e.data.maxDepth,
        term: e.data.term,
        mask: e.data.mask,
      });
      
      if(results != undefined) {
        postMessage({ action: "result", results });
      } else {
        let dictionary = Dictionary[e.data.varCount - 2];
        let maskedDictionary = new Map();
        for(let i = 0; i < dictionary.length; i++) {
          let dict = dictionary[i];
          let maskedTerm = dict[0] | e.data.mask;
          let complexity = dict[1];
          if(maskedDictionary.has(maskedTerm)) {
            if(complexity < maskedDictionary.get(maskedTerm)) {
              maskedDictionary.set(maskedTerm, complexity);
            }
          } else {
            maskedDictionary.set(maskedTerm, complexity);
          }
        }
        // find the two terms of the shortest combined complexity that, when XOR'ed together, give the searched term
        let pair = [],
          min = Infinity;
        for (let term0 of maskedDictionary) {
          let complementary = (e.data.term ^ term0[0]) | e.data.mask;
          if(maskedDictionary.has(complementary)) {
            let term1Complexity = maskedDictionary.get(complementary);
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
