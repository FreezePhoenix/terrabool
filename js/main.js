import UI from "./state/handler.js";

let worker = new Worker("./js/worker/worker.js", {type: "module"});
let transmatrix = new Worker("./js/worker/transmatrix.js", {type: "module"});
UI.init({
  onSingle: single,
  onMulti: multi,
  onAbort: abort,
  onNext: next,
  onPrev: prev,
});

function validateTerm(term) {
  let varCount = 2;
  switch (term.length) {
    case 4:
      varCount = 2;
      break;
    case 8:
      varCount = 3;
      break;
    case 16:
      varCount = 4;
      break;
    default:
      throw new Error("Invalid value length");
  }
  if (!term.match(/^[01a-z]+$/)) {
    throw new Error("Use only 0 and 1");
  }
  return varCount;
}

export function single() {
  // Data validation
  let term = UI.getSingleTermValue();
  let varCount;
  try {
    varCount = validateTerm(term);
  } catch (e) {
    UI.showError(e.message);
    return;
  }

  UI.onStartSingleEvent();

  // Separate don't cares from the term, reformat as integers.
  let mask = parseInt(
    term.replace(/[1a-z]/g, (a) => (a == "1" ? "0" : "1")),
    2
  );
  term = parseInt(term.replace(/[a-z]/g, "1"), 2);

  worker.postMessage({
    action: "search",
    varCount: varCount,
    maxDepth: varCount + 1,
    term: term,
    mask: mask,
  });
}

export function multi() {
  let terms = UI.getMultiTermsValues();
  let varCount,
    mask,
    hardLimit = UI.getMultiLimit();

  try {
    varCount = validateTerm(terms[0]);
    mask = parseInt(
      terms[0].replace(/[1a-z]/g, (a) => (a == "1" ? "0" : "1")),
      2
    );
    for (let i = 1; i < terms.length; i++) {
      if (varCount != validateTerm(terms[i])) {
        throw new Error("All terms must have the same length");
      }
      if (
        mask !=
        parseInt(
          terms[i].replace(/[1a-z]/g, (a) => (a == "1" ? "0" : "1")),
          2
        )
      ) {
        throw new Error("All terms must have the same don't cares");
      }
    }
    terms = terms.map((a) => parseInt(a.replace(/[a-z]/g, "1"), 2));
  } catch (e) {
    UI.showMultiError(e.message);
    return;
  }

  UI.onStartMultiEvent();

  transmatrix.postMessage({
    action: "generate",
    varCount: varCount,
    terms: terms,
    mask: mask,
    hardLimit: hardLimit,
  });
}

var testStartTime;
export function startTest(varCount, maxDepth) {
  testStartTime = Date.now();
  worker.postMessage({
    action: "test",
    varCount: varCount,
    maxDepth: maxDepth,
  });
}

worker.onmessage = (e) => {
  switch (e.data.action) {
    case "result":
      UI.onSingleResultEvent();

      if (e.data.results) {
        let csvContent =
          "data:text/csv;charset=utf-8,\uFEFF" +
          e.data.results.map((a) => a[0]).join("\n");
        UI.setDownload(encodeURI(csvContent));

        UI.setResultSingle(e.data.results);
      } else {
        UI.setResultUnexpectedError();
      }
      break;

    case "double":
      UI.onSingleResultEvent();

      if (e.data.results1 && e.data.results2) {
        let [array1, array2] = [
          e.data.results1.map((a) => a[0]),
          e.data.results2.map((a) => a[0]),
        ];
        let maxLength = Math.max(array1.length, array2.length);
        let transposedArray = [];
        for (let i = 0; i < maxLength; i++) {
          transposedArray[i] = [array1[i] ?? "", array2[i] ?? ""];
        }
        let csvContent =
          "data:text/csv;charset=utf-8,\uFEFF" +
          transposedArray.map((a) => a.join(";")).join("\n");
        UI.setDownload(encodeURI(csvContent));

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
let index, matrices;
transmatrix.onmessage = (e) => transmatrix_onmessage(e);
function transmatrix_onmessage(e) {
  switch (e.data.action) {
    case "matrices":
      UI.onMultiResultEvent();

      if (e.data.results) {
        localStorage.setItem("matrices", JSON.stringify(e.data.results));
        matrices = e.data.results;
        index = 0;
        display();
      }
      break;
    case "count":
      UI.setMultiProgress(e.data.count);
      break;
  }
}
function next() {
  if (index < matrices.length) index++;
  display();
}
function prev() {
  if (index > 0) index--;
  display();
}
function display() {
  if (matrices[index][2].length <= 4) {
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
  transmatrix = new Worker("./js/worker/transmatrix.js", {type: "module"});
  transmatrix.onmessage = (e) => transmatrix_onmessage(e);
  UI.onMultiResultEvent();
}
