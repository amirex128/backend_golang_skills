# Performance, Benchmarking, and Observability of Behavior

Measure before changing code. Use representative inputs, stable environments, repeated benchmark runs, `b.Loop()` on modern Go, `ReportAllocs`, CPU/heap/goroutine/block/mutex profiles, and `benchstat`. Avoid micro-optimizing without a user-visible bottleneck. Check algorithmic complexity, allocations, copying, contention, I/O, query plans, serialization, and queue/backpressure behavior.

Prefer bounded memory: stream rows and large transfers, preallocate known sizes, avoid repeated conversions and reflection, use strings/bytes intentionally, and cache only with invalidation and memory limits. Concurrency can improve throughput but can also increase contention, leaks, and tail latency; profile before adding workers.

When a performance regression appears, use a before/after benchmark or profile, identify the hot path, change one variable, and verify correctness, race safety, and resource limits. Keep performance claims tied to measurements and workload.
