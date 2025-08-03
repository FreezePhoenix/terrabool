import UI from "./state/handler.js";

let worker = new Worker("./js/worker/worker.js", { type: "module" });
let transmatrix = new Worker("./js/worker/transmatrix.js", { type: "module" });
UI.init({
  onSingle: single,
  onMulti: multi,
  onAbort: abort,
  onNext: next,
  onPrev: prev,
});

export function single() {
  const term = UI.getSingleTermValue();

  try {
    const varCount = term.getValidTermSize();
    // Separate don't cares from the term, reformat as integers.
    const mask = term.parseMask();

    UI.onStartSingleEvent();

    worker.postMessage({
      action: "search",
      varCount: varCount,
      maxDepth: varCount + 1,
      term: term.parseTerm(),
      mask: mask,
    });
  } catch (e) {
    UI.showError(e.message);
  }
}

export function multi() {
  let terms = UI.getMultiTermsValues();
  const hardLimit = UI.getMultiLimit();

  try {
    const varCount = terms[0].getValidTermSize();
    const mask = terms[0].parseMask();
    for (let i = 1; i < terms.length; i++) {
      if (varCount != terms[i].getValidTermSize()) {
        throw new Error("All terms must have the same length");
      }
      if (mask != terms[i].parseMask()) {
        throw new Error("All terms must have the same don't cares");
      }
    }
    terms = terms.map((term) => term.parseTerm());

    UI.onStartMultiEvent();

    transmatrix.postMessage({
      action: "generate",
      varCount: varCount,
      terms: terms,
      mask: mask,
      hardLimit: hardLimit,
    });
  } catch (e) {
    UI.showMultiError(e.message);
  }
}

String.prototype.getValidTermSize = function () {
  if (!this.match(/^[01a-z]+$/)) {
    throw new Error("Use only 0, 1 and lower case letters");
  }

  switch (this.length) {
    case 4:
      return 2;
    case 8:
      return 3;
    case 16:
      return 4;
    default:
      throw new Error("Invalid value length");
  }
};

String.prototype.parseTerm = function () {
  return parseInt(this.replace(/[a-z]/g, "1"), 2);
};

String.prototype.parseMask = function () {
  return parseInt(
    this.replace(/[1a-z]/g, (a) => (a == "1" ? "0" : "1")),
    2
  );
};

var testStartTime;
export function startTest(varCount, maxDepth) {
  testStartTime = Date.now();
  worker.postMessage({
    action: "test",
    varCount: varCount,
    maxDepth: maxDepth,
  });
}

// Single input worker. Generates terms.
worker.onmessage = (e) => {
  switch (e.data.action) {
    case "result":
      UI.onSingleResultEvent();

      if (e.data.results) {
        const csvContent =
          "data:text/csv;charset=utf-8,\uFEFF" +
          e.data.results.map((a) => `"${a[0]}"`).join("\n");
        UI.setDownload(encodeURI(csvContent));

        UI.setResultSingle(e.data.results);
      } else {
        UI.setResultUnexpectedError();
      }
      break;

    case "double":
      UI.onSingleResultEvent();

      if (e.data.results1 && e.data.results2) {
        // Make a csv file where the results are in two columns.
        const [array1, array2] = [
          e.data.results1.map((a) => a[0]),
          e.data.results2.map((a) => a[0]),
        ];
        const maxLength = Math.max(array1.length, array2.length);
        let transposedArray = [];
        for (let i = 0; i < maxLength; i++) {
          transposedArray[i] = [`"${array1[i] ?? ""}"`, `"${array2[i] ?? ""}"`];
        }
        const csvContent =
          "data:text/csv;charset=utf-8,\uFEFF" +
          transposedArray.map((a) => a.join(",")).join("\n");
        UI.setDownload(encodeURI(csvContent));

        // Display results.
        UI.setResultDouble(e.data.results1, e.data.results2);
      } else {
        UI.setResultUnexpectedError();
      }
      break;

    case "test":
      let timeTaken = Date.now() - testStartTime;
      console.log(Math.round(timeTaken / 1000) + " seconds");
      console.log(e.data.results.filter((a) => a != null));
      break;
  }
};

let index = 0;
let matrices = JSON.parse(localStorage.getItem("matrices"));
UI.setNextPrevState(index, matrices);
if (matrices != null) UI.displayMatrix(matrices[index]);

// Multi input worker. Generates transition matrices.
transmatrix.onmessage = (e) => transmatrix_onmessage(e);
function transmatrix_onmessage(e) {
  switch (e.data.action) {
    case "matrices":
      UI.onMultiResultEvent();

      if (e.data.results) {
        localStorage.setItem("matrices", JSON.stringify(e.data.results));
        matrices = e.data.results;
        index = 0;
        UI.setNextPrevState(index, matrices);
        UI.displayMatrix(matrices[index]);
      }
      break;
    case "count":
      UI.setMultiProgress(e.data.count);
      break;
  }
}

function next() {
  if (matrices != null && index < matrices.length - 1)
    index++;
  UI.setNextPrevState(index, matrices);
  UI.displayMatrix(matrices[index]);
}

function prev() {
  if (index > 0) index--;
  UI.setNextPrevState(index, matrices);
  UI.displayMatrix(matrices[index]);
}

function display() {
  if (matrices[index].rows.length <= 4) {
    // 4x4 matrix or smaller. Trivial to wire outputs
  } else {
    // The bigger the matrix, the harder to wire outputs.
    // Looking at the transform matrix, the same color can be assigned
    // once in a column(kind of like sudoku).
    // Also, the same color can't be on adjacent columns or rows.
    // Exceptions to the rule are when a group of gates contribute to many outputs.
    //
    // heuristic idea: AND all row pairs to get common bits, count duplicate rows,
    // prioritize groups with most common bits, most duplicates
    //
  }
}

export function abort() {
  transmatrix.terminate();
  transmatrix = new Worker("./js/worker/transmatrix.js", { type: "module" });
  transmatrix.onmessage = (e) => transmatrix_onmessage(e);
  UI.onMultiResultEvent();
}
