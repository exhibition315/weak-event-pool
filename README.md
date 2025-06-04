# weak-event-pool
A simple event pool implementation that uses `WeakRef` to hold references to event handlers, allowing them to be garbage collected automatically when they are no longer referenced elsewhere.

## Features

-   Subscribe to events with `on` and `once`.
-   Unsubscribe handlers using the handler function or the returned `symbol` ID.
-   Handlers are held with `WeakRef`, enabling automatic garbage collection.
-   Manual sweeping of dead handlers via `sweepDeadHandlers`.
-   Debug utility `gcDebug` to inspect the pool state.

## Installation

```bash
npm install weak-event-pool
# or
yarn add weak-event-pool
```

## Usage Example

```typescript
import EventPool from 'weak-event-pool';

// 1. Basic Subscription and Emission
console.log('--- Basic Subscription ---');
const handler1 = (data: { message: string }) => console.log('Handler 1 received:', data.message);
EventPool.on('myEvent', handler1);
EventPool.emit('myEvent', { message: 'Hello!' }); // Output: Handler 1 received: Hello!

// 2. Unsubscribing
console.log('\n--- Unsubscribing ---');
EventPool.off('myEvent', handler1);
EventPool.emit('myEvent', { message: 'This will not be received' }); // No output

// 3. Unsubscribing by ID
console.log('\n--- Unsubscribing by ID ---');
const handler2 = (data: { message: string }) => console.log('Handler 2 received:', data.message);
const handler2Id = EventPool.on('anotherEvent', handler2);
EventPool.offById(handler2Id);
EventPool.emit('anotherEvent', { message: 'This will not be received either' }); // No output

// 4. Once Listener
console.log('\n--- Once Listener ---');
const onceHandler = (data: { message: string }) => console.log('Once handler received:', data.message);
EventPool.once('singleEvent', onceHandler);
EventPool.emit('singleEvent', { message: 'First emit' }); // Output: Once handler received: First emit
EventPool.emit('singleEvent', { message: 'Second emit' }); // No output (handler was removed)

// 5. Weak Reference and Sweeping (Requires running with --expose-gc in Node.js)
console.log('\n--- Weak Reference & Sweeping ---');
let weakHandler: ((data: { message: string }) => void) | null = (data: { message: string }) => console.log('Weak handler received:', data.message);
EventPool.on('weakEvent', weakHandler);
EventPool.emit('weakEvent', { message: 'Before GC' }); // Output: Weak handler received: Before GC

// Remove the strong reference to the handler
weakHandler = null;

console.log('Suggesting Garbage Collection...');
if (global.gc) {
  global.gc(); // Suggest GC (behavior is implementation-dependent)
} else {
  console.warn('global.gc is not available. Run Node.js with --expose-gc flag for this part of the example.');
}

console.log('Calling sweepDeadHandlers...');
EventPool.sweepDeadHandlers(); // Manually clean up handlers whose WeakRef has been collected

EventPool.emit('weakEvent', { message: 'After GC' }); // No output if handler was collected and swept

EventPool.gcDebug(); // Inspect the state of the event pool

// Clean up for subsequent examples/tests
EventPool.removeAll();
```

## API

`EventPool` is a static class and cannot be instantiated. All methods are accessed directly on `EventPool`.

*   `EventPool.on<T = any>(event: string, handler: Handler<T>): symbol`
    Registers a handler function for a specific event. Returns a unique `symbol` ID for the subscription.
*   `EventPool.once<T = any>(event: string, handler: Handler<T>): symbol`
    Registers a handler function that will be invoked only once for the specified event. Returns a unique `symbol` ID.
*   `EventPool.off<T = any>(event: string, handler: Handler<T>): void`
    Unregisters a specific handler function from an event.
*   `EventPool.offById(eventId: symbol): void`
    Unregisters a handler using its unique `symbol` ID returned by `on` or `once`.
*   `EventPool.removeAll(): void`
    Removes all registered handlers for all events.
*   `EventPool.removeAllListeners(event: string): void`
    Removes all registered handlers for a specific event.
*   `EventPool.emit<T = any>(event: string, ...args: T[]): void`
    Emits an event, invoking all registered handlers for that event. Automatically calls `cleanDeadHandlers` for the event before emitting.
*   `EventPool.sweepDeadHandlers(): void`
    Iterates through all events and removes handlers whose `WeakRef` has been collected by the garbage collector. This is done automatically before each `emit`, but can be called manually if needed.
*   `EventPool.gcDebug(): void`
    Prints the current state of the event pool to the console, showing active and potentially collected handlers for debugging purposes.

## How it Works

Instead of holding strong references to handler functions, `EventPool` uses `WeakRef`. This means that if a handler function is no longer referenced anywhere else in your application, the JavaScript engine's garbage collector is free to reclaim the memory occupied by that function.

The `sweepDeadHandlers` method (called automatically by `emit` and available manually) then iterates through the stored `WeakRef` instances. If `deref()` returns `undefined`, it indicates the original handler has been collected, and the corresponding entry is removed from the event pool's internal maps. This prevents the pool from growing indefinitely with references to functions that no longer exist.

## Development

*   Build: `npm run build`
*   Test: `npm test`
*   Coverage: `npm run coverage`
*   Run Example: `npm run example` (requires Node.js with `--expose-gc` flag for the GC demonstration part)

## License

MIT

## Links

*   Repository: https://github.com/exhibition315/weak-event-pool.git
*   Issues: https://github.com/exhibition315/weak-event-pool/issues
*   Homepage: https://github.com/exhibition315/weak-event-pool#readme
```
