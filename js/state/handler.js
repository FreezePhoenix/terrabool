export default class UIStateHandler {
  static #error = document.getElementById("error");

  static #error_multi = document.getElementById("error_multi");
  static #result_multi = document.getElementById("result_multi");

  static #loader = document.getElementById("loader");
  static #loader_multi = document.getElementById("loader_multi");

  static #a_download = document.getElementById("download");
  static #download_multi = document.getElementById("download_multi");

  static #input_term = document.getElementById("term");

  static #multi_progress = document.getElementById("multi_progress");
  static #input_hardlimit = document.getElementById("hardlimit");
  static #multi_compute = document.getElementById("multi_compute");
  static #multi_abort = document.getElementById("multi_abort");
  static #result_multi_prev = document.getElementById("result_multi_prev");
  static #result_multi_next = document.getElementById("result_multi_next");
  static #btn_single = document.getElementById("btn_single");

  static #tab_single = document.getElementById("tab_single");
  static #tab_multi = document.getElementById("tab_multi");

  static #multi_field_group = document.getElementById("multi_field_group");
  static #multi_new_field = document.getElementById("multi_new_field");

  static #single_form = document.getElementById("single_form");
  static #multi_form = document.getElementById("multi_form");

  static #result = document.getElementById("result");
  static #displayed_matrix = document.getElementById("displayed_matrix");

  static init({ onSingle, onMulti, onAbort, onNext, onPrev }) {
    document
      .querySelectorAll("#tabbar input")
      .forEach((tab) =>
        tab.addEventListener("click", UIStateHandler.#switchTab)
      );

    document.addEventListener("DOMContentLoaded", function () {
      UIStateHandler.#switchTab();
      if (UIStateHandler.#multi_field_group.children.length == 0) {
        UIStateHandler.#multi_field_group.style.display = "none";
      }
    });

    this.#single_form.addEventListener("submit", function (event) {
      event.preventDefault();
      onSingle();
    });

    this.#multi_form.addEventListener("submit", function (event) {
      event.preventDefault();
      onMulti();
    });

    this.#multi_abort.addEventListener("click", function (event) {
      event.preventDefault();
      onAbort();
    });

    this.#result_multi_prev.addEventListener("click", onPrev);
    this.#result_multi_next.addEventListener("click", onNext);

    this.#multi_new_field.addEventListener("input", function () {
      const input = document.createElement("input");
      input.classList.add("multi_output");
      input.type = "text";
      input.value = this.value;
      UIStateHandler.#multi_field_group.style.display = "flex";
      UIStateHandler.#multi_field_group.appendChild(input);
      input.focus();
      UIStateHandler.#textLength(input);
      this.value = "";
    });

    this.#multi_new_field.addEventListener("paste", function (e) {
      e.preventDefault();

      let paste = (e.clipboardData || window.clipboardData)
        .getData("text")
        .split("\n");
      for (let p of paste) {
        const input = document.createElement("input");
        input.classList.add("multi_output");
        input.type = "text";
        input.value = p;
        UIStateHandler.#multi_field_group.style.display = "flex";
        UIStateHandler.#multi_field_group.appendChild(input);
        UIStateHandler.#textLength(input);
      }
    });

    this.#multi_field_group.addEventListener("change", function (e) {
      if (e.target.value == "") {
        e.target.remove();
      }
      if (UIStateHandler.#multi_field_group.children.length == 0) {
        // this.#multi_new_field.focus();
        UIStateHandler.#multi_field_group.style.display = "none";
      }
    });

    this.#multi_field_group.addEventListener("input", function (e) {
      UIStateHandler.#textLength(e.target);
    });
    this.#input_term.addEventListener("input", function (e) {
      UIStateHandler.#textLength(e.target);
    });
  }

  static showError(message) {
    this.#error.style.display = "block";
    this.#error.innerHTML = message;
  }
  static showMultiError(message) {
    this.#error_multi.style.display = "block";
    this.#error_multi.innerHTML = message;
  }
  static clearError() {
    this.#error.style.display = "none";
  }
  static clearMultiError() {
    this.#error_multi.style.display = "none";
  }

  static getSingleTermValue() {
    return this.#input_term.value;
  }

  static getMultiTermsValues() {
    return Array.from(
      document.querySelectorAll("#multi_field_group .multi_output"),
      (a) => a.value
    );
  }

  static getMultiLimit() {
    return this.#input_hardlimit.value;
  }

  static onStartSingleEvent() {
    this.#result.innerHTML = "";
    this.#error.style.display = "none";
    this.#a_download.style.display = "none";
    this.#loader.style.display = "inline-block";
  }

  static onSingleResultEvent() {
    this.#loader.style.display = "none";
  }

  static onStartMultiEvent() {
    this.#displayed_matrix.innerHTML = "";
    this.#error_multi.style.display = "none";
    this.#download_multi.style.display = "none";
    this.#loader_multi.style.display = "inline-block";
    this.#multi_abort.style.display = "inline-block";
    this.#multi_compute.style.display = "flex";
    this.#multi_progress.innerText = "0/0";
  }

  static onMultiResultEvent() {
    this.#loader_multi.style.display = "none";
    this.#multi_abort.style.display = "none";
  }

  static setMultiProgress(count) {
    this.#multi_progress.innerText = count;
  }

  static setDownload(encodedUri) {
    this.#a_download.setAttribute("href", encodedUri);
    this.#a_download.setAttribute("download", this.#input_term.value + ".csv");
    this.#a_download.style.display = "inline-block";
  }

  static setResultSingle(terms) {
    this.#result.innerHTML = terms.map((a) => a[0]).join("<br>");
  }

  static setResultDouble(terms1, terms2) {
    const firstColumn = terms1.map((a) => a[0]).join("<br>");
    const secondColumn = terms2.map((a) => a[0]).join("<br>");

    this.#result.innerHTML = `<div class="double">
                    <div>${firstColumn}</div>
                    <div>${secondColumn}</div>
                </div>`;
  }

  static setResultUnexpectedError() {
    this.#result.innerHTML = `Something went wrong. Please report this as a bug.`;
  }

  static setNextPrevState(index, matrices){
    if(matrices == null){
      this.#result_multi.style.display = "none";
    }else{
      this.#result_multi.style.display = "block";
      this.#result_multi_next.disabled = index == matrices.length-1;
      this.#result_multi_prev.disabled = index == 0;
    }
  }

  static displayMatrix({ complexity, rows, transitioned, mask }, varCount, outputs) {
    let text = `<table>`;
    for (let i = 0; i < rows.length; i++) {
      let num = transitioned[i].toString(2).padStart(2 ** varCount, "0");
      let txtMask = mask.toString(2).padStart(16, "0");
      num = num.split('').map((a, idx) => (txtMask[idx] == "1" ? "x" : a)).join('');
      text += `<tr><td>${num}</td>`;
      for(let j = 0; j < outputs; j++) {
        text += `<td>${((rows[i] >> j) & 1).toString(2)}</td>`;
      }
      text += `</tr>`;
    }
    text += `</table>`;

    this.#displayed_matrix.innerHTML = `<div class='grid'>${text}<span>${complexity}</span></div>`;
  }

  static #switchTab() {
    if (UIStateHandler.#btn_single.checked) {
      UIStateHandler.#tab_single.classList.add("active");
      UIStateHandler.#tab_multi.classList.remove("active");
    } else {
      UIStateHandler.#tab_single.classList.remove("active");
      UIStateHandler.#tab_multi.classList.add("active");
    }
  }

  static #textLength(e) {
    const length = e.value.length;
    if (length === 4 || length === 8 || length === 16) {
      e.style.color = "#00C8FF";
    } else {
      e.style.color = "black";
    }
  }
}
