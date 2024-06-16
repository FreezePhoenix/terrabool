const worker = new Worker("js/worker.js");
// const transmatrix = new Worker("js/transmatrix.js");
const error = document.getElementById("error");
const error_multi = document.getElementById("error_multi");
const result = document.getElementById("result");
const loader = document.getElementById("loader");
const a_download = document.getElementById("download");
const input_term = document.getElementById("term");
const tabbar = document.getElementById("tabbar");
const btn_single = document.getElementById("btn_single");
const tab_single = document.getElementById("tab_single");
const tab_multi = document.getElementById("tab_multi");
const multi_new_field = document.getElementById("multi_new_field");

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
    const l = e.target.value.length;
    if(l === 4 || l === 8 || l === 16){
        e.target.style.color = "#00C8FF";
    }else{
        e.target.style.color = "black";
    }
}
multi_field_group.addEventListener("input", e => textLength(e));
input_term.addEventListener("input", e => textLength(e));

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
    let varCount;

    try {
        varCount = validateTerm(terms[0]);
        for(let i = 1; i < terms.length; i++){
            if(varCount != validateTerm(terms[i])){
                throw new Error("All terms must have the same length");
            }
        }
    } 
    catch (e) {
        error_multi.style.display = "block";
        error_multi.innerHTML = e.message;
        return;
    }
    // TODO
    
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
                let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + e.data.results.join("\n");
                let encodedUri = encodeURI(csvContent);
                a_download.setAttribute("href", encodedUri);
                a_download.setAttribute("download", input_term.value + ".csv");
                a_download.style.display = "inline-block";

                result.innerHTML = e.data.results.join("<br>");
            }else{
                result.innerHTML = `Something went wrong. Please report this as a bug.`;
            }
        break;

        case "double":
            loader.style.display = "none";

            if(e.data.results1 && e.data.results2){
                let array = [e.data.results1,e.data.results2];
                array = array[0].map((_, colIndex) => array.map(row => row[colIndex])); // transpose
                let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
                + array.map(a => a.join(",")).join("\n");

                let encodedUri = encodeURI(csvContent);
                a_download.setAttribute("href", encodedUri);
                a_download.setAttribute("download", input_term.value + ".csv");
                a_download.style.display = "inline-block";

                result.innerHTML = `<div class="double">
                    <div>${e.data.results1.join("<br>")}</div>
                    <div>${e.data.results2.join("<br>")}</div>
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