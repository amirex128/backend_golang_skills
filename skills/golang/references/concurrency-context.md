# Concurrency and Context

Treat every goroutine as a resource with an owner, purpose, exit condition, and cancellation path. Prefer synchronous code until concurrency provides a measured benefit.

## Goroutines and cancellation

Pass a context into every blocking or external operation. Use `context.WithCancel`, `WithTimeout`, or `WithDeadline` and call the cancel function. Select on `ctx.Done()` in loops and workers. Do not store contexts in structs, use context values for optional parameters, or use `context.Background()` to discard request cancellation. Use `context.WithoutCancel` only for deliberately detached work with its own bounded lifetime.

## Channels and pipelines

The sender owns closing a channel; receivers generally do not close it. Use directional channel types, nil channels deliberately, and `select` with cancellation. Range over channels until closure. For pipelines, each stage must drain/stop on cancellation and close its output exactly once. Avoid goroutine leaks caused by sends with no receiver or workers that cannot observe shutdown.

## Synchronization

Use `sync.Mutex` for protecting mutable invariants, `RWMutex` only when read parallelism is measured, `sync.Once` for one-time initialization, atomics for small independent counters/state, and `sync.Map` only for its specialized workload. Use `errgroup.WithContext` for coordinated work and cancellation; use `singleflight` to suppress duplicate concurrent work. Bound worker pools, queues, fan-out, and retries. Run `go test -race ./...` for shared-state changes.

## Review checklist

Identify ownership, happens-before relationships, shutdown behavior, blocking calls, channel closure, shared maps/counters, loop-variable capture, and error propagation. A `WaitGroup` must have balanced `Add`/`Done` and a defined `Wait`; never copy synchronization primitives after first use.
