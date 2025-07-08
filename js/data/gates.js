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
        combine: (numbers) => {
            let encountered = 0;
            let over = 0;
            while(numbers) {
                over |= numbers.mask & encountered;
                encountered |= numbers.mask;
                numbers = numbers.prev;
            }
            return ~over & encountered;
        }
    },
    {   
        symbol:"∧",
        combine: (numbers) => {
            let result = ~0;
            while(numbers) {
                result &= numbers.mask;
                numbers = numbers.prev;
            }
            return result;
        }
    },
    // {   
    //     symbol:"∨",
    //     combine: (numbers) => numbers.reduce((a, b) => a | b)
    // },
];
