#include <emscripten/bind.h>
#include <utility>
#include <array>
#include <cstdint>
#include <string>
#include <vector>
#include <string_view>

constexpr const uint16_t Terms[][32] = {
    {
        0b0000,
        0b1111,
        0b1100,
        0b1010,
        0b0011,
        0b0101,
        0b0110,
        0b1001
    },
    {
        0b00000000,
        0b11111111,
        0b11110000,
        0b11001100,
        0b10101010,
        0b00001111,
        0b00110011,
        0b01010101,
        0b00111100,
        0b01011010,
        0b01100110,
        0b11000011,
        0b10100101,
        0b10011001,
        0b10010110,
        0b01101001
    },
    {
        0b0000000000000000,
        0b1111111111111111,
        0b1111111100000000,
        0b1111000011110000,
        0b1100110011001100,
        0b1010101010101010,
        0b0000000011111111,
        0b0000111100001111,
        0b0011001100110011,
        0b0101010101010101,
        0b0000111111110000,
        0b0011001111001100,
        0b0101010110101010,
        0b0011110000111100,
        0b0101101001011010,
        0b0110011001100110,
        0b1111000000001111,
        0b1100110000110011,
        0b1010101001010101,
        0b1100001111000011,
        0b1010010110100101,
        0b1001100110011001,
        0b1100001100111100,
        0b1010010101011010,
        0b1001100101100110,
        0b1001011010010110,
        0b0011110011000011,
        0b0101101010100101,
        0b0110011010011001,
        0b0110100101101001,
        0b0110100110010110,
        0b1001011001101001
    }
};

constexpr const std::pair<std::string_view, uint8_t> Symbols[][32] = {
    {
        {"0", 0b00000},
        {"1", 0b00001},
        {"a", 0b00010},
        {"b", 0b00100},
        {"¬a", 0b00011},
        {"¬b", 0b00101},
        {"ab", 0b00111},
        {"¬ab", 0b00111}
    },
    {
        {"0", 0b00000},
        {"1", 0b00001},
        {"a", 0b00010},
        {"b", 0b00100},
        {"c", 0b01000},
        {"¬a", 0b00011},
        {"¬b", 0b00101},
        {"¬c", 0b01001},
        {"ab", 0b00110},
        {"ac", 0b01010},
        {"bc", 0b01100},
        {"¬ab", 0b00111},
        {"¬ac", 0b01011},
        {"¬bc", 0b01101},
        {"abc", 0b01110},
        {"¬abc", 0b01111}
    },
    {
        {"0", 0b00000},
        {"1", 0b00001},
        {"a", 0b00010},
        {"b", 0b00100},
        {"c", 0b01000},
        {"d", 0b10000},
        {"¬a", 0b00011},
        {"¬b", 0b00101},
        {"¬c", 0b01001},
        {"¬d", 0b10001},
        {"ab", 0b00110},
        {"ac", 0b01010},
        {"ad", 0b10010},
        {"bc", 0b01100},
        {"bd", 0b10100},
        {"cd", 0b11000},
        {"¬ab", 0b00111},
        {"¬ac", 0b01011},
        {"¬ad", 0b10011},
        {"¬bc", 0b01101},
        {"¬bd", 0b10101},
        {"¬cd", 0b11001},
        {"abc", 0b01110},
        {"abd", 0b10110},
        {"acd", 0b11010},
        {"bcd", 0b11100},
        {"¬abc", 0b01111},
        {"¬abd", 0b10111},
        {"¬acd", 0b11011},
        {"¬bcd", 0b11101},
        {"abcd", 0b11110},
        {"¬abcd", 0b11111}
    }
};

uint16_t negate(uint16_t term, size_t var_count) {
    return ~term & ((1 << (1 << var_count)) - 1);
}

struct Chain {
    const Chain* prev;
    size_t idx;
    uint16_t CACHE_0;
    uint16_t CACHE_1;
};

uint16_t OR_GATE(Chain* numbers, uint16_t mask) {
    if(numbers->prev) {
        return numbers->CACHE_0 = numbers->prev->CACHE_0 | mask;
    }
    return numbers->CACHE_0 = mask;
}

uint16_t XOR_GATE(Chain* numbers, uint16_t mask) {
    if(numbers->prev) {
        uint16_t over = numbers->prev->CACHE_1 | (mask & numbers->prev->CACHE_0);
        uint16_t encountered = numbers->CACHE_0;
        numbers->CACHE_1 = over;
        return ~over & encountered;
    }
    return mask;
}



template<typename T, size_t S>
struct inplace_vector {
    using value_type = T;
    constexpr static size_t size = S;
    std::array<T, S> backing;
    size_t _size;
    void resize(size_t size) {this->_size = size;}
    auto end() {return backing.begin() + this->_size;}
    auto cend() const {return backing.cbegin() + this->_size;}
    auto begin() {return backing.begin();}
    auto cbegin() const {return backing.cbegin();}
    T& operator[](std::size_t idx)       { return backing[idx]; }
    const T& operator[](std::size_t idx) const { return backing[idx]; }
};


struct Solution {
    std::string symbol_string;
    inplace_vector<uint8_t, 5> wire_lamps;
};

void identity(const uint16_t* legalTerms, Chain* val, size_t count, std::vector<Solution>& solutions, uint16_t term, uint16_t neg_term, const std::pair<std::string_view, uint8_t>* symbols) {
    auto vterm = legalTerms[val->idx];
    if(count == 1) {
        if(vterm == term) {
            const auto& symbol_pair = symbols[val->idx];
            solutions.emplace_back(Solution { std::string {std::get<0>(symbol_pair) },  { std::get<1>(symbol_pair) } });
        }
    } else {
        {
            auto t = OR_GATE(val, vterm);
            if(t == term || t == neg_term) {
                Solution& solution = solutions.emplace_back();

                std::string& symbol_string = solution.symbol_string;
                auto& wire_lamps = solution.wire_lamps;
                wire_lamps.resize(count);
                symbol_string = std::get<0>(symbols[val->idx]);
                symbol_string.push_back(')');
                const Chain* current = val->prev;
                auto index = count;
                wire_lamps[index--] = std::get<1>(symbols[val->idx]);
                while(current != nullptr) {
                    const auto& cterm = symbols[current->idx];
                    symbol_string.insert(0, ", ");
                    symbol_string.insert(0, std::get<0>(cterm));
                    wire_lamps[--index] = std::get<1>(cterm);
                    current = current->prev;
                }
                symbol_string.insert(0, t == term ? "∨(" : "¬∨(");
            }
        }
        {
            auto t = XOR_GATE(val, vterm);
            if(t == term || t == neg_term) {
                Solution& solution = solutions.emplace_back();

                std::string& symbol_string = solution.symbol_string;
                auto& wire_lamps = solution.wire_lamps;
                wire_lamps.resize(count);
                symbol_string = std::get<0>(symbols[val->idx]);
                symbol_string.push_back(')');
                const Chain* current = val->prev;
                auto index = count;
                wire_lamps[index--] = std::get<1>(symbols[val->idx]);
                while(current != nullptr) {
                    const auto& cterm = symbols[current->idx];
                    symbol_string.insert(0, ", ");
                    symbol_string.insert(0, std::get<0>(cterm));
                    wire_lamps[--index] = std::get<1>(cterm);
                    current = current->prev;
                }
                symbol_string.insert(0, t == term ? "⊕(" : "¬⊕(");
            }
        }
    }
}

Chain chains[242824];
uint16_t real_legal_terms[32];

std::vector<Solution> makeExpressionsBFS(size_t varCount, size_t maxDepth, uint16_t term, uint16_t mask) {
    uint16_t neg_term = negate(term, varCount);
    term = term & ~mask;
    const auto& legalTerms = Terms[varCount - 2];
    const auto& legalSymbols = Symbols[varCount - 2];
    const size_t num_terms = 2 << varCount;

    Chain* queueTail = chains;

    for (size_t i = 0; i < num_terms; i++) {
        real_legal_terms[i] = legalTerms[i] & ~mask;
        queueTail->CACHE_0 = real_legal_terms[i];
        queueTail->CACHE_1 = 0;
        queueTail->idx = i;
        queueTail->prev = nullptr;
        queueTail++;
    }

    Chain* queueEnd = queueTail;
    Chain* queueHead = chains;

    std::vector<Solution> solutions;

    size_t count = 0;
    queueEnd = queueTail;
    while (queueHead != queueEnd) {
        count++;
        while(queueHead != queueEnd) {
            Chain* val = queueHead++;

            identity(real_legal_terms, val, count, solutions, term, neg_term, legalSymbols);

            if (count < maxDepth) {
                if((val->CACHE_1 & term) && (val->CACHE_1 & neg_term)) {
                    continue;
                }
                for (size_t i = val->idx + 1; i < num_terms; i++) {
                    queueTail->prev = val;
                    queueTail->idx = i;
                    queueTail++;
                }
            }
        }
        queueEnd = queueTail;
    }
    return solutions;
}

EMSCRIPTEN_BINDINGS(my_module) {
    emscripten::function("makeExpressionsBFS", &makeExpressionsBFS);
    emscripten::value_array<Solution>("Solution")
        .element(&Solution::symbol_string)
        .element(&Solution::wire_lamps);
}

template <typename T, size_t S, typename... Policies>
inplace_vector<T, S> inplacevecFromJSArray(const emscripten::val& v, Policies... policies) {
  const uint32_t l = v["length"].as<uint32_t>();

  inplace_vector<T, S> rv;
  rv.resize(l);
  for (uint32_t i = 0; i < l; ++i) {
    rv[i] = v[i].as<T>(std::forward<Policies>(policies)...);
  }

  return rv;
}

namespace emscripten {
namespace internal {

template <typename T, typename Allocator>
struct BindingType<std::vector<T, Allocator>> {
  using ValBinding = BindingType<val>;
  using WireType = ValBinding::WireType;

  static WireType toWireType(const std::vector<T, Allocator> &vec, rvp::default_tag) {
    return ValBinding::toWireType(val::array(vec), rvp::default_tag{});
  }

  static std::vector<T, Allocator> fromWireType(WireType value) {
    return vecFromJSArray<T>(ValBinding::fromWireType(value));
  }
};

template <typename T, size_t S>
struct BindingType<inplace_vector<T, S>> {
  using ValBinding = BindingType<val>;
  using WireType = ValBinding::WireType;

  static WireType toWireType(const inplace_vector<T, S> &vec, rvp::default_tag) {
    return ValBinding::toWireType(val::array(vec.cbegin(), vec.cend()), rvp::default_tag{});
  }

  static inplace_vector<T, S> fromWireType(WireType value) {
    return inplacevecFromJSArray<T, S>(ValBinding::fromWireType(value));
  }
};

template <typename T>
struct TypeID<
    T,
    typename std::enable_if_t<std::is_same<
        typename Canonicalized<T>::type,
        std::vector<typename Canonicalized<T>::type::value_type,
                    typename Canonicalized<T>::type::allocator_type>>::value>> {
  static constexpr TYPEID get() { return TypeID<val>::get(); }
};

template <typename T>
struct TypeID<
    T,
    typename std::enable_if_t<std::is_same<
        typename Canonicalized<T>::type,
        inplace_vector<typename Canonicalized<T>::type::value_type, Canonicalized<T>::type::size>>::value>> {
  static constexpr TYPEID get() { return TypeID<val>::get(); }
};

} // namespace internal
} // namespace emscripten