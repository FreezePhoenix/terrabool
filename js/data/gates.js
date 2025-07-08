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
            for(let i = 0; i < numbers.length; i++) {
                let number = numbers[i];
                over |= number & encountered;
                encountered |= number;
            }
            return ~over & encountered;
        }
    },
    {   
        symbol:"∧",
        combine: (numbers) => {
            let result = ~0;
            for(let i = 0; i < numbers.length; i++) {
                result &= numbers[i];
            }
            return result;
        }
    },
    // {   
    //     symbol:"∨",
    //     combine: (numbers) => numbers.reduce((a, b) => a | b)
    // },
];
