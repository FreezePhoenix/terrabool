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

importScripts("dictionary.js");
/**
 * tests if a number is a power of two
 * @param {number} x 
 * @returns {boolean}
 */
function powerOfTwo(x) {
    return Math.log2(x) % 1 === 0;
}

/**
 * tests if a set of rows is linearly independent in GF(2)
 * @param {number[]} rows 
 * @returns {boolean} 
 */
function isInvertible(rows, pad = 2**rows.length){
    let term, bitmask;
    for(let i = 3; i < pad; i++){
        if(powerOfTwo(i)) continue; // skip a trivial combination
        term = 0;
        bitmask = 1;
        for(let j = 0; j < rows.length; j++){
            if((i&bitmask) != 0) term ^= rows[j];
            bitmask <<= 1;
        }
        if(rows.includes(term)) return false;
    }
    return true;
}

/**
 * Performs a GF(2) transition on a set of terms using a transition matrix
 * @param {number[]} rows: The rows of the transition matrix
 * @param {number[]} terms: The terms to be transitioned
 * @returns {number[]} Transitioned terms
 */
function transition(rows, terms) {
    let newTerms = Array(terms.length).fill(0);

    for (let i=0; i<terms.length; i++){
        let bitmask = 1;
        for(let j=0; j<terms.length; j++){
            if((rows[i]&bitmask) != 0){
                newTerms[i] ^= terms[j];
            }
            bitmask <<= 1;
        }
    }
    return newTerms;
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
 * @returns {[viableCombinations,TermMap]} viable linear combinations array, and pruned map of terms
 */
function getGoodTerms(terms, mask=0){
    const masked_dictionary = Dictionary.map(a => [(a[0] | mask), a[1]]);
    let precursorTerms = [];

    for(let i = 1; i < 2**terms.length; i++){ // try all linear combinations
        let bitmask = 0b1;
        precursor = 0b0;
        for(let j=0b0; j<terms.length; j++){ // apply transition
            if((i&bitmask) != 0){
                precursor ^= terms[j];
            }
            bitmask <<= 1;
        }
        const minimum = Math.min(...masked_dictionary.filter(a => a[0] == (precursor | mask)).map(a => a[1]));// get the minimum lamp count
        if(minimum != Infinity){ // if the transitioned term is not in the dictionary, don't include it
            precursorTerms.push({precursor:precursor,linearCombination:i,lampCount:minimum});
        }
    }
    precursorTerms.sort((a,b) => a.lampCount - b.lampCount);
    return {
        linearCombinations: precursorTerms.map(a => a.linearCombination),
        goodTermsMap: new Map(precursorTerms.map(a => [a.precursor,a.lampCount])),
    };
}

/**
 * Generates all transition matrices for a given set of terms
 * @param {number[]} terms 
 * @param {number} mask 
 * @returns {number[][]} Partially sorted transition matrices
 */
function combinations(terms, mask=0, hardLimit=Infinity) {
    const {linearCombinations, goodTermsMap} = getGoodTerms(terms,mask);
    let combination = new Array(terms.length).fill(0);
    const dim = goodTermsMap.size;
    let idx = 0;
    let BigRes = [];
    while (idx >= 0) {
        if (combination[idx] >= dim) {
            idx--;
        } else if (idx === terms.length - 1) {
            // check the matrix
            let lin_combinations = combination.map(a => linearCombinations[a]);
            if (isInvertible(lin_combinations)) {
                const transitioned = transition(lin_combinations,terms);
                let res = [];
                for(let term of transitioned){
                    res.push([goodTermsMap.get(term),term]);
                }
                let lampSum = res.map(a => a[0]).reduce((a,b) => a+b,0);
                
                // TODO: remove table structure
                let text = `<table>`;
                for(let row of lin_combinations){
                    text += `<tr><td>${(row + 2**terms.length).toString(2).substring(1).split('').join('</td><td>')}</td></tr>`;
                }
                text +=`<tr>${res.map(a => `<td><table><tr><td>${a[0]}</td></tr><tr><td>${a[1]}</td></tr></table></td>`).join('')}</tr></table>`;
                BigRes.push([lampSum,text]);
            }
            if(BigRes.length >= hardLimit) return BigRes;
        } else {
            idx++;
            combination[idx] = combination[idx - 1];
        }
        combination[idx]++;
    }
    return BigRes;
}

//// Hex seven segment driver
// const terms = [
//     0b1101111101110001,
//     0b0010011110011111,
//     0b0010111111111011,
//     0b1111110101000101,
//     0b1110111101111100,
//     0b0111101101101101,
//     0b1101011111101101,
// ];
// const mask = 0b0;

// BCD to bin module
// const terms = [
//     0b0001100000000000,
//     0b0000011111110000,
//     0b0000011011001100,
//     0b0001010110101010
// ];
// const mask = 0b1110000000000000;

// const goodTerms = getGoodTerms(terms,mask);
// console.log(goodTerms);

// const matrices = combinations(terms,mask);

// matrices.sort((a,b) => a[0] - b[0]);
// let txt = '';
// for(res of matrices){
//     txt += `<div class='grid'>${res[1]}<span>${res[0]}</span></div>`;
// }
// content.innerHTML += txt;

onmessage = e => {
    switch (e.data.action) {

    }
}
