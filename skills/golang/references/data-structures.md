# Data Structures, Memory, and Defensive Values

## Slices and maps

A slice is a descriptor over an array; `append` may reuse capacity and create aliases. Do not retain or mutate caller-owned backing arrays without documenting ownership; copy when isolation matters. Preallocate when size is known, but avoid speculative capacity. A nil slice and empty slice differ in JSON and API semantics. A nil map can be read but panics on write; initialize maps in constructors or before mutation. Maps are not safe for concurrent writes: use ownership, a mutex, or a purpose-fit concurrent structure.

Use `slices` and `maps` standard packages where available. Use arrays for fixed-size values, `container/heap` for priority queues, `container/list` only when linked-list semantics are actually needed, and `container/ring` for circular structures. `strings.Builder` suits string construction; `bytes.Buffer` suits byte-oriented I/O.

## Pointers and generics

Pass small immutable values by value. Use pointers for mutation, large structs, optional values, or identity. Check typed-nil interfaces and pointer receivers carefully. Avoid `unsafe.Pointer` and `weak.Pointer` unless a measured, documented low-level requirement justifies them. Prefer generic typed helpers to `[]any`; preserve comparable constraints where map/set operations need them.

## Defensive safety

Protect zero values or make invalid zero values obvious. Check numeric conversions for overflow and truncation; do not compare floats with `==` for approximate values. Never `defer` resource cleanup inside an unbounded loop; close each iteration or extract a helper. Make ownership, copying, and mutation visible in APIs.
