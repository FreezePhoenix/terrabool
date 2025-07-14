// Special negation function, since js stores 32 bit integers, but we need 4/8/16 bits.
export function negate(term,var_count){
    return ~term & ((1 << (2 ** var_count)) - 1);
}

export const Gates = [
    // {   
    //     symbol:"⨀",
    //     combine: (numbers,vcount) => negate(Xor(numbers),vcount)
    // },
    {   
        symbol:"⊕", 
        combine: (terms, numbers) => {
            let mask = terms[numbers.idx][1];
            if(numbers.prev) {
                let over = numbers.prev.XOR_CACHE_O | (mask & numbers.prev.XOR_CACHE_E);
                let encountered = mask | numbers.prev.XOR_CACHE_E;
                numbers.XOR_CACHE_O = over;
                numbers.XOR_CACHE_E = encountered;
                return ~over & encountered;
            }
            numbers.XOR_CACHE_O = 0;
            numbers.XOR_CACHE_E = mask;
            return mask;
        }
    },
    {   
        symbol:"∧",
        combine: (terms, numbers) => {
            let mask = terms[numbers.idx][1];
            if(numbers.prev) {
                return numbers.AND_CACHE = numbers.prev.AND_CACHE & mask;
            }
            return numbers.AND_CACHE = mask;
        }
    },
    // {   
    //     symbol:"∨",
    //     combine: (numbers) => numbers.reduce((a, b) => a | b)
    // },
];
