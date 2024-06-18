let worker = new Worker("js/worker.js");
let transmatrix = new Worker("js/transmatrix.js");
const error = document.getElementById("error");
const error_multi = document.getElementById("error_multi");
const result = document.getElementById("result");
const result_multi = document.getElementById("result_multi");
const loader = document.getElementById("loader");
const loader_multi = document.getElementById("loader_multi");
const a_download = document.getElementById("download");
const download_multi = document.getElementById("download_multi");
const input_term = document.getElementById("term");
const tabbar = document.getElementById("tabbar");
const btn_single = document.getElementById("btn_single");
const tab_single = document.getElementById("tab_single");
const tab_multi = document.getElementById("tab_multi");
const multi_new_field = document.getElementById("multi_new_field");
const multi_progress = document.getElementById("multi_progress");
const input_hardlimit = document.getElementById("hardlimit");
const multi_compute = document.getElementById("multi_compute");
const multi_abort = document.getElementById("multi_abort");

document.querySelectorAll("#tabbar input").forEach(tab => tab.addEventListener("click",switchTab));
document.addEventListener("DOMContentLoaded", () => { 
    switchTab(); 
    if(multi_field_group.children.length == 0){
        multi_field_group.style.display = "none";
    }
});
function switchTab(){
    if(btn_single.checked){
        tab_single.classList.add("active");
        tab_multi.classList.remove("active");
    }else{
        tab_single.classList.remove("active");
        tab_multi.classList.add("active");
    }
}
multi_new_field.addEventListener("input",function(){
    const input = document.createElement("input");
    input.classList.add("multi_output");
    input.type = "text";
    input.value = this.value;
    multi_field_group.style.display = "flex";
    multi_field_group.appendChild(input);
    input.focus();
    textLength(input);
    this.value = "";
});
multi_field_group.addEventListener("change",function(e){
    if(e.target.value == ""){
        e.target.remove();
    }
    if(multi_field_group.children.length == 0){
        // multi_new_field.focus();
        multi_field_group.style.display = "none";
    }
});
function textLength(e){
    const l = e.value.length;
    if(l === 4 || l === 8 || l === 16){
        e.style.color = "#00C8FF";
    }else{
        e.style.color = "black";
    }
}
multi_field_group.addEventListener("input", e => textLength(e.target));
input_term.addEventListener("input", e => textLength(e.target));

function validateTerm(term){
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
    if(!term.match(/^[01a-z]+$/)){
        throw new Error("Use only 0 and 1");
    }
    return varCount;
}

function single(){
    // Data validation
    let term = input_term.value;
    let varCount;
    try {
        varCount = validateTerm(term);
    } 
    catch (e) {
        error.style.display = "block";
        error.innerHTML = e.message;
        return;
    }

    result.innerHTML = "";
    error.style.display = "none";
    a_download.style.display = "none";
    loader.style.display = "inline-block";

    // separate don't cares from the term, reformat as integers.
    let mask = parseInt(term.replace(/[1a-z]/g,a => (a=='1')?'0':'1'),2);
    term = parseInt(term.replace(/[a-z]/g,"1"),2);

    worker.postMessage({
        action: 'search',
        varCount: varCount,
        maxDepth: varCount + 1,
        term: term,
        mask: mask
    });
}

function multi(){
    let terms = Array.from(document.querySelectorAll("#multi_field_group .multi_output"),a => a.value);
    let varCount, mask, hardLimit=input_hardlimit.value;

    try {
        varCount = validateTerm(terms[0]);
        mask = parseInt(terms[0].replace(/[1a-z]/g,a => (a=='1')?'0':'1'),2);
        for(let i = 1; i < terms.length; i++){
            if(varCount != validateTerm(terms[i])){
                throw new Error("All terms must have the same length");
            }
            if(mask != parseInt(terms[i].replace(/[1a-z]/g,a => (a=='1')?'0':'1'),2)){
                throw new Error("All terms must have the same don't cares");
            }
        }
        terms = terms.map(a => parseInt(a.replace(/[a-z]/g,"1"),2));
    } 
    catch (e) {
        error_multi.style.display = "block";
        error_multi.innerHTML = e.message;
        return;
    }

    result_multi.innerHTML = "";
    error_multi.style.display = "none";
    download_multi.style.display = "none";
    loader_multi.style.display = "inline-block";
    multi_abort.style.display = "inline-block";
    multi_compute.style.display = "flex";
    multi_progress.innerText = "0/0";

    transmatrix.postMessage({
        action: 'generate',
        varCount: varCount,
        terms: terms,
        mask: mask,
        hardLimit: hardLimit
    });
}

var start;// holds the testing start time
function startTest(varCount,maxDepth){
    start = Date.now();
    worker.postMessage({
        action: 'test',
        varCount: varCount,
        maxDepth: maxDepth
    });
}

worker.onmessage = e => {
    switch (e.data.action) {
        case "result":
            loader.style.display = "none";

            if(e.data.results){
                let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + e.data.results.map(a => a[0]).join("\n");
                let encodedUri = encodeURI(csvContent);
                a_download.setAttribute("href", encodedUri);
                a_download.setAttribute("download", input_term.value + ".csv");
                a_download.style.display = "inline-block";

                result.innerHTML = e.data.results.map(a => a[0]).join("<br>");
            }else{
                result.innerHTML = `Something went wrong. Please report this as a bug.`;
            }
        break;

        case "double":
            loader.style.display = "none";

            if(e.data.results1 && e.data.results2){
                let [array1, array2] = [e.data.results1.map(a => a[0]),e.data.results2.map(a => a[0])];
                let maxLength = Math.max(array1.length, array2.length);
                let transposedArray = [];
                for (let i = 0; i < maxLength; i++) {
                    transposedArray[i] = [array1[i] ?? "", array2[i] ?? ""];
                }
                let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
                                 + transposedArray.map(a => a.join(";")).join("\n");

                let encodedUri = encodeURI(csvContent);
                a_download.setAttribute("href", encodedUri);
                a_download.setAttribute("download", input_term.value + ".csv");
                a_download.style.display = "inline-block";

                result.innerHTML = `<div class="double">
                    <div>${e.data.results1.map(a => a[0]).join("<br>")}</div>
                    <div>${e.data.results2.map(a => a[0]).join("<br>")}</div>
                </div>`;
            }else{
                result.innerHTML = `Something went wrong. Please report this as a bug.`;
            }
        break;

        case "test":
        let timeTaken = Date.now() - start;
        console.log(Math.round(timeTaken/1000) + " seconds");
            console.log(e.data.results.filter(a => a != null));
        break;
    }
}

transmatrix.onmessage = e => transmatrix_onmessage(e);
function transmatrix_onmessage(e){
    switch (e.data.action) {
        case "matrices":
            loader_multi.style.display = "none";
            multi_abort.style.display = "none";
            //TODO
        break;
        case "count":
            multi_progress.innerText = e.data.count;
        break;
    }
}

function abort(){
    transmatrix.terminate();
    transmatrix = new Worker("js/transmatrix.js");
    transmatrix.onmessage = e => transmatrix_onmessage(e);
    loader_multi.style.display = "none";
    multi_abort.style.display = "none";
}