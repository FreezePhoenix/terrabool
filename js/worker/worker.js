import { Terms } from "../data/terms.js";
import { Gates, negate } from "../data/gates.js";
import { Dictionary } from "../data/dictionary.js";

/**
 * Creates the lookup table from dictionary.js
 * @param {number} varCount: number of variables (2 to 4)
 * @param {Array.<{string, number}>} val: combinations of [Printable expression, Truth table value]
 * @param {number} count: the number of terms in the expression
 * @param {Array.<{number, number}>} solutions: array of [boolean function, min depth to solve]
 */
const testfunc = ({ varCount, val, count, solutions }) => {
  for (let gate of Gates) {
    let term = gate.combine(val, varCount);
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
 * @param {number} varCount: number of variables (2 to 4)
 * @param {number} term: the term to be expressed
 * @param {number} mask: a mask taking care of don't cares
 * @param {Array.<string, number>} val: combinations of [Printable expression, Truth table value]
 * @param {number} count: the number of terms in the expression
 * @param {string[]} solutions: the array of solutions
 */
const identity = ({ varCount, term, neg_term, mask, val, count, solutions }) => {
  if (count === 1) {
    if ((val.mask | mask) == term) {
      solutions.push([val.symbol, val.wire_lamp]);
    }
  } else {
    for (let gate of Gates) {
      const t = gate.combine(val, varCount);
      if ((t | mask) == term) {
        let symbol_string = val.symbol;
        let current = val.prev;
        let wire_lamps = new Array(val.depth);
        let index = val.depth;
        do {
          symbol_string = current.symbol + ", " + symbol_string;
          wire_lamps[--index] = current.wire_lamp;
          current = current.prev;
        } while(current != null);
        
        // valid expression found. add it to solutions
        solutions.push([
          `${gate.symbol}(${symbol_string})`,
          wire_lamps,
        ]);
      } else if (t | mask == neg_term) {
        let symbol_string = val.symbol;
        let current = val.prev;
        let wire_lamps = new Array(val.depth);
        let index = val.depth;
        do {
          symbol_string = current.symbol + ", " + symbol_string;
          wire_lamps[--index] = current.wire_lamp;
          current = current.prev;
        } while(current != null);
        
        solutions.push([
          `¬${gate.symbol}(${symbol_string})`,
          wire_lamps,
        ]);
      }
    }
  }
};


class Queue {
    head = null;
    tail = null;
    constructor() {}
    enqueue(data) {
        if(this.head == null) {
            this.head = this.tail = data;
        } else {
            this.tail.next = data;
            this.tail = data;
        }
    }
    dequeue() {
      if(this.head == null) {
          return null;
      }
      let temp = this.head;
      this.head = temp.next;
      return temp;
    }
    empty() {
      return this.head == null;
    }
}

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
  for(let i = 0; i < legalTerms.length; i++) {
    let v = legalTerms[i];
    queue.enqueue({
      val: {
        symbol: v[0],
        mask: v[1],
        wire_lamp: v[2],
        depth: 1,
        prev: null
      },
      idx: i,
      count: 1,
      next: null
    });
  }
  let solutions = [];

  while (!queue.empty()) {
    let { val, idx, count } = queue.dequeue();

    callback({
      varCount: varCount,
      neg_term: neg_term,
      term: term,
      mask: mask,
      val: val,
      count: count,
      solutions: solutions,
    });

    if (count < maxDepth) {
      let available = true;
      for (let i = idx + 1; i < legalTerms.length; i++) {
        let term = legalTerms[i];
        let newVal = {
          symbol: term[0],
          mask: term[1],
          wire_lamp: term[2],
          depth: val.depth + 1,
          prev: val
        }
        queue.enqueue({ val: newVal, idx: i, count: count + 1, next: null });
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
        // find the two terms of the shortest combined complexity that, when XOR'ed together, give the searched term
        let pair = [],
          min = Infinity;
        for (let j of maskedDictionary) {
          const found = maskedDictionary.filter(
            (a) => a[0] == ((e.data.term ^ j[0]) | e.data.mask)
          );
          for (let f of found) {
            if (f[1] + j[1] < min) {
              pair = [f[0], j[0]];
              min = f[1] + j[1];
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
