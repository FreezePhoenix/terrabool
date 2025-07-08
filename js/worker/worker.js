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
const testfunc = (varCount, val, count, solutions) => {
  for (let gate of Gates) {
    let term = gate.combine(
      val.map((a) => a[1]),
      varCount
    );
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
const identity = (varCount, val, count, solutions, term, mask) => {
  if (count === 1) {
    if ((val[0][1] | mask) == term) {
      solutions.push([val[0][0], val[0][2]]);
    }
  } else {
    for (let gate of Gates) {
      const t = gate.combine(
        val.map((a) => a[1]),
        varCount
      );
      if ((t | mask) == term) {
        // valid expression found. add it to solutions
        solutions.push([
          `${gate.symbol}(${val.map((a) => a[0]).join(", ")})`,
          val.map((a) => a[2]),
        ]);
      } else if ((negate(t, varCount) | mask) == term) {
        solutions.push([
          `¬${gate.symbol}(${val.map((a) => a[0]).join(", ")})`,
          val.map((a) => a[2]),
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
  const legalTerms = Terms[varCount];
  // Initialize the queue with the individual terms.
  let queue = new Queue();
  for(let i = 0; i < legalTerms.length; i++) {
    let v = legalTerms[i];
    queue.enqueue({
      val: [v],
      idx: i,
      count: 1,
      next: null
    });
  }
  let solutions = [];

  while (!queue.empty()) {
    let { val, idx, count } = queue.dequeue();

    callback(varCount, val, count, solutions, term, mask);

    if (count < maxDepth) {
      let available = true;
      for (let i = idx + 1; i < legalTerms.length; i++) {
        let newStr = [...val, legalTerms[i]];
        queue.enqueue({ val: newStr, idx: i, count: count + 1, next: null });
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
