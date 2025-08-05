#include <cstdint>
#include <emscripten/bind.h>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

// This abomination is the terms table.
constexpr const std::uint16_t Terms[][32] = {
	{0b0000, 0b1111, 0b1100, 0b1010, 0b0011, 0b0101, 0b0110, 0b1001},
	{0b00000000, 0b11111111, 0b11110000, 0b11001100, 0b10101010, 0b00001111,
	 0b00110011, 0b01010101, 0b00111100, 0b01011010, 0b01100110, 0b11000011,
	 0b10100101, 0b10011001, 0b10010110, 0b01101001},
	{0b0000000000000000, 0b1111111111111111, 0b1111111100000000,
	 0b1111000011110000, 0b1100110011001100, 0b1010101010101010,
	 0b0000000011111111, 0b0000111100001111, 0b0011001100110011,
	 0b0101010101010101, 0b0000111111110000, 0b0011001111001100,
	 0b0101010110101010, 0b0011110000111100, 0b0101101001011010,
	 0b0110011001100110, 0b1111000000001111, 0b1100110000110011,
	 0b1010101001010101, 0b1100001111000011, 0b1010010110100101,
	 0b1001100110011001, 0b1100001100111100, 0b1010010101011010,
	 0b1001100101100110, 0b1001011010010110, 0b0011110011000011,
	 0b0101101010100101, 0b0110011010011001, 0b0110100101101001,
	 0b0110100110010110, 0b1001011001101001}};

// Symbol table. The string is the symbol, the integer is the lamp mask.
constexpr const std::pair<std::string_view, std::uint8_t> Symbols[][32] = {
	{{"0", 0b00000},
	 {"1", 0b00001},
	 {"a", 0b00010},
	 {"b", 0b00100},
	 {"¬a", 0b00011},
	 {"¬b", 0b00101},
	 {"ab", 0b00111},
	 {"¬ab", 0b00111}},
	{{"0", 0b00000},
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
	 {"¬abc", 0b01111}},
	{{"0", 0b00000},	{"1", 0b00001},	   {"a", 0b00010},
	 {"b", 0b00100},	{"c", 0b01000},	   {"d", 0b10000},
	 {"¬a", 0b00011},	{"¬b", 0b00101},   {"¬c", 0b01001},
	 {"¬d", 0b10001},	{"ab", 0b00110},   {"ac", 0b01010},
	 {"ad", 0b10010},	{"bc", 0b01100},   {"bd", 0b10100},
	 {"cd", 0b11000},	{"¬ab", 0b00111},  {"¬ac", 0b01011},
	 {"¬ad", 0b10011},	{"¬bc", 0b01101},  {"¬bd", 0b10101},
	 {"¬cd", 0b11001},	{"abc", 0b01110},  {"abd", 0b10110},
	 {"acd", 0b11010},	{"bcd", 0b11100},  {"¬abc", 0b01111},
	 {"¬abd", 0b10111}, {"¬acd", 0b11011}, {"¬bcd", 0b11101},
	 {"abcd", 0b11110}, {"¬abcd", 0b11111}}};

std::uint16_t negate(std::uint16_t term, std::size_t var_count) {
	// Negate a term whilst keeping the number of bits
	// accurate to the number of variables
	return ~term & ((1 << (1 << var_count)) - 1);
}

struct Chain {
	// This is a pointer to a *const Chain* not a *const pointer* to a chain.
	const Chain *prev;
	std::uint16_t idx;
	std::uint16_t CACHE_0;
	std::uint16_t CACHE_1;
};

// Preconditions: CACHE_0 is set to current's.
// Postconditions: CACHE_0 is set to current's.
std::uint16_t OR_GATE(Chain *numbers, std::uint16_t mask) {
	return numbers->CACHE_0;
}
// Preconditions: CACHE_0 is set to prev's, CACHE_1 is set to prev's.
// Postconditions: CACHE_0 is set to current's, CACHE_1 is set to current's.
std::uint16_t XOR_GATE(Chain *numbers, std::uint16_t mask) {
	std::uint16_t over = numbers->CACHE_1 | (mask & numbers->CACHE_0);
	numbers->CACHE_0 |= mask;
	numbers->CACHE_1 = over;
	return ~over & numbers->CACHE_0;
}

struct Solution {
	std::string symbol_string;
	std::vector<std::uint8_t> wire_lamps;
	Solution() {}
	Solution(const std::string_view &string, const std::uint8_t &lamp)
		: symbol_string(string), wire_lamps(lamp) {}
};

void identity(const std::uint16_t *legalTerms, Chain *val, std::size_t count,
			  std::vector<Solution> &solutions, std::uint16_t term,
			  std::uint16_t negatedTerm,
			  const std::pair<std::string_view, std::uint8_t> *symbols) {
	auto vterm = legalTerms[val->idx];
	// If it's the first term in a chain, we don't need to to any processing.
	if (count == 1) {
		if (vterm == term) {
			// Surely there must be a better way to do this...
			const auto &symbol_pair = symbols[val->idx];
			solutions.emplace_back(std::get<0>(symbol_pair),
								   std::get<1>(symbol_pair));
		}
	} else {
		// Process XOR first, since it updates the caches.
		{
			auto t = XOR_GATE(val, vterm);
			// Test if the chain produces the desired term (or its complement).
			if (t == term || t == negatedTerm) {
				Solution &solution = solutions.emplace_back();
				std::string &symbol_string = solution.symbol_string;
				auto &wire_lamps = solution.wire_lamps;
				wire_lamps.resize(count);
				symbol_string = std::get<0>(symbols[val->idx]);
				symbol_string.push_back(')');
				const Chain *current = val->prev;
				auto index = count;
				wire_lamps.at(--index) = std::get<1>(symbols[val->idx]);
				while (current != nullptr) {
					const auto &cterm = symbols[current->idx];
					symbol_string.insert(0, ", ");
					symbol_string.insert(0, std::get<0>(cterm));
					wire_lamps.at(--index) = std::get<1>(cterm);
					current = current->prev;
				}
				symbol_string.insert(0, t == term ? "⊕(" : "¬⊕(");
			}
		}
		{
			auto t = OR_GATE(val, vterm);
			// Test if the chain produces the desired term (or its complement).
			if (t == term || t == negatedTerm) {
				Solution &solution = solutions.emplace_back();

				std::string &symbol_string = solution.symbol_string;
				auto &wire_lamps = solution.wire_lamps;
				wire_lamps.resize(count);
				symbol_string = std::get<0>(symbols[val->idx]);
				symbol_string.push_back(')');
				const Chain *current = val->prev;
				auto index = count;
				wire_lamps.at(--index) = std::get<1>(symbols[val->idx]);
				while (current != nullptr) {
					const auto &cterm = symbols[current->idx];
					symbol_string.insert(0, ", ");
					symbol_string.insert(0, std::get<0>(cterm));
					wire_lamps.at(--index) = std::get<1>(cterm);
					current = current->prev;
				}
				symbol_string.insert(0, t == term ? "∨(" : "¬∨(");
			}
		}
	}
}

// Statically allocate the queue.
Chain chains[242824];
std::uint16_t maskedLegalTerms[32];

std::vector<Solution> makeExpressionsBFS(std::size_t varCount,
										 std::size_t maxDepth,
										 std::uint16_t term,
										 std::uint16_t mask) {
	// Compute the negation of the term.
	std::uint16_t negatedTerm = negate(term, varCount);
	// Fix original term. We shouldn't set bits we don't care about.
	term = term & ~mask;
	// Grab the array of legal terms, and legal symbols.
	const auto &legalTerms = Terms[varCount - 2];
	const auto &legalSymbols = Symbols[varCount - 2];
	// Compute the number of terms and symbols.
	const std::size_t num_terms = 2 << varCount;

	// Start the queue. queueTail represents the tail of the *next* queue.
	Chain *queueTail = chains;

	// Initialize the masked legal terms and the first elements in the queue.
	for (std::size_t i = 0; i < num_terms; i++) {
		maskedLegalTerms[i] = legalTerms[i] & ~mask;
		queueTail->CACHE_0 = maskedLegalTerms[i];
		queueTail->CACHE_1 = 0;
		queueTail->idx = i;
		queueTail->prev = nullptr;
		queueTail++;
	}

	// queueEnd represents the tail of the *current* queue.
	Chain *queueEnd = queueTail;
	// queueHead represents the head of the *current* queue.
	Chain *queueHead = chains;

	// Vector of solutions.
	std::vector<Solution> solutions;

	// Current depth.
	std::size_t count = 0;

	// While the current queue is not empty (that is, the head is not the tail).
	while (queueHead != queueEnd) {
		// Increment the current depth.
		count++;
		// While the current queue is not empty (that is, the head is not the
		// tail).
		while (queueHead != queueEnd) {
			// Get the current head.
			Chain *val = queueHead++;

			// Test the current head.
			identity(maskedLegalTerms, val, count, solutions, term, negatedTerm,
					 legalSymbols);

			// If we should continue
			if (count < maxDepth) {
				// Check if the term is even viable. If it isn't... we don't
				// need to work on it further.
				if ((val->CACHE_1 & term) && (val->CACHE_1 & negatedTerm)) {
					// A term is not viable if the XOR is preventing bits from
					// being set that we want set. In this case, that aligns to
					// the CACHE_1 having bits set that are also set in term, as
					// well as having bits set that are also set in negatedTerm.
					// To be inviable, the term must also be setting bits that
					// we do not want set. This aligns with CACHE_0 having bits
					// set that are *not* set in term (but also bits we care
					// about, so thus *are* set in negatedTerm), and the same
					// for negatedTerm. Notably, if bits are set in CACHE_1,
					// they are also set in CACHE_0. So we can avoid checking
					// CACHE_0 if we just check CACHE_1.
					continue;
				}
				// Add derived terms into the queue.
				for (std::size_t i = val->idx + 1; i < num_terms; i++) {
					queueTail->prev = val;
					queueTail->idx = i;
					queueTail->CACHE_0 = val->CACHE_0;
					queueTail->CACHE_1 = val->CACHE_1;
					queueTail++;
				}
			}
		}
		// Preconditions: queueHead == queueEnd (the current queue is empty).
		// Set the current queue to the next queue
		// by setting the tail of the current queue to be the tail of the next
		// queue.
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

namespace emscripten {
namespace internal {

template <typename T, typename Allocator>
struct BindingType<std::vector<T, Allocator>> {
	using ValBinding = BindingType<val>;
	using WireType = ValBinding::WireType;

	static WireType toWireType(const std::vector<T, Allocator> &vec,
							   rvp::default_tag) {
		return ValBinding::toWireType(val::array(vec), rvp::default_tag{});
	}

	static std::vector<T, Allocator> fromWireType(WireType value) {
		return vecFromJSArray<T>(ValBinding::fromWireType(value));
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

} // namespace internal
} // namespace emscripten