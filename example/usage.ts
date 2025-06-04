import EventPool from '../src/EventPool.js';

console.log('======= EventPool usage example =======');

// 1. Register and emit it
console.log('1. Register and emit an event');
EventPool.on('eventName', (data: { key: string }) => console.log('Event 1 received with data:', data));
EventPool.emit('eventName', { key: 'case1' });
EventPool.removeAll();

// 2. Register and unregister it
console.log('2. Register, unregister, then emit (handler should not be called)');
const handler = (data: { key: string }) => console.log('Event 2 received with data:', data); // This should not log
EventPool.on('eventName', handler);
EventPool.off('eventName', handler);
EventPool.emit('eventName', { key: 'case2' });
EventPool.removeAll();

// 3. Register and unregister by eventId
console.log('3. Register, unregister by eventId, then emit (handler should not be called)');
const eventId = EventPool.on('eventName', (data: { key: string }) => console.log('Event 3 received with data:', data)); // This should not log
EventPool.offById(eventId);
EventPool.emit('eventName', { key: 'case3' });
EventPool.removeAll();

// 4. Demonstrate once()
console.log('4. Demonstrate once()');
const onceHandler = (data: { key: string }) => console.log('Once event received:', data);
EventPool.once('onceEvent', onceHandler);
EventPool.emit('onceEvent', { key: 'first emit' }); // Should trigger the handler
EventPool.emit('onceEvent', { key: 'second emit' }); // Should NOT trigger the handler
EventPool.removeAll();

// 5. Demonstrate sweepDeadHandlers
console.log('5. SweepDeadHandlers');
let handlerForSweep: ((data: { key: string }) => void) | null = (data: { key: string }) => console.log('Handler for sweep received:', data);
EventPool.on('sweepEvent', handlerForSweep);
EventPool.emit('sweepEvent', { key: 'case4-emit1' });

// Simulate the handler being eligible for GC
handlerForSweep = null;

console.log('Suggesting Garbage Collection...');
if (global.gc) {
  global.gc();
} else {
  console.warn('global.gc is not available. Run with --expose-gc node flag.');
}

console.log('Calling sweepDeadHandlers...');
EventPool.sweepDeadHandlers();
EventPool.gcDebug();

console.log('======= EventPool usage example =======');
