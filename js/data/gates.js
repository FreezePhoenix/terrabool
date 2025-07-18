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
        combine: (numbers, mask) => {
            if(numbers.prev) {
                let over = numbers.prev.CACHE_1 | (mask & numbers.prev.CACHE_0);
                let encountered = mask | numbers.prev.CACHE_0;
                numbers.CACHE_1 = over;
                numbers.CACHE_0 = encountered;
                return ~over & encountered;
            }
            numbers.CACHE_1 = 0;
            numbers.CACHE_0 = mask;
            return mask;
        }
    },
    {   
        symbol:"∨",
        combine: (numbers, mask) => {
            return numbers.CACHE_0;
        }
    },
    // {   
    //     symbol:"∨",
    //     combine: (numbers) => numbers.reduce((a, b) => a | b)
    // },
];
