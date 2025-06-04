import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import EventPool from '../src/EventPool.js';

describe('EventPool', () => {
  beforeEach(() => {
    EventPool.removeAll();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register a handler and emit an event', () => {
    const handler = vi.fn();
    const eventName = 'testEvent';
    const eventData = { message: 'hello' };

    EventPool.on(eventName, handler);
    EventPool.emit(eventName, eventData);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(eventData);
  });

  it('should register multiple handlers for the same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const eventName = 'multiHandlerEvent';
    const eventData = { message: 'multiple' };

    EventPool.on(eventName, handler1);
    EventPool.on(eventName, handler2);
    EventPool.emit(eventName, eventData);

    expect(handler1).toHaveBeenCalledWith(eventData);
    expect(handler2).toHaveBeenCalledWith(eventData);
  });
  it('should unregister a handler using off()', () => {
    const handler = vi.fn();
    const eventName = 'testEvent';

    EventPool.on(eventName, handler);
    EventPool.off(eventName, handler);
    EventPool.emit(eventName, { message: 'hello' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not throw when calling off() with non-existent event or handler', () => {
    const handler = vi.fn();
    const eventName = 'nonExistentEvent';

    expect(() => EventPool.off(eventName, handler)).not.toThrow();
    EventPool.on('existingEvent', handler);
    expect(() => EventPool.off('existingEvent', vi.fn())).not.toThrow(); // Non-existent handler on existing event
    expect(() => EventPool.off('nonExistentEvent', handler)).not.toThrow(); // Non-existent event with existing handler instance
    EventPool.removeAll();
    expect(() => EventPool.off('nonExistentEvent', handler)).not.toThrow(); // Non-existent event and handler
  });

  it('should unregister a handler using offById()', () => {
    const handler = vi.fn();
    const eventName = 'testEvent';

    const eventId = EventPool.on(eventName, handler);
    EventPool.offById(eventId);
    EventPool.emit(eventName, { message: 'hello' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not throw when calling offById() with non-existent eventId', () => {
    expect(() => EventPool.offById(Symbol('nonExistent'))).not.toThrow();
  });

  it('should handle once() correctly', () => {
    const handler = vi.fn();
    const eventName = 'onceEvent';

    EventPool.once(eventName, handler);
    EventPool.emit(eventName, { message: 'first' });
    EventPool.emit(eventName, { message: 'second' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ message: 'first' });
  });

  it('should remove all listeners for a specific event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const eventName = 'multiListenerEvent';

    EventPool.on(eventName, handler1);
    EventPool.on(eventName, handler2);
    EventPool.removeAllListeners(eventName);
    EventPool.emit(eventName, {});

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should not throw when calling removeAllListeners() with non-existent event', () => {
    expect(() => EventPool.removeAllListeners('nonExistentEvent')).not.toThrow();
  });

  it('should remove all listeners for all events', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    EventPool.on('eventA', handler1);
    EventPool.on('eventB', handler2);
    EventPool.removeAll();
    EventPool.emit('eventA', {});
    EventPool.emit('eventB', {});

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should emit events even if there are no listeners', () => {
    expect(() => EventPool.emit('eventWithoutListeners', { data: 'none' })).not.toThrow();
  });

  it('should clean up dead handlers using sweepDeadHandlers', () => {
    const eventName = 'sweepTest';
    const liveHandler = vi.fn();
    let deadHandler: ((data: any) => void) | null = vi.fn();

    EventPool.on(eventName, liveHandler);
    const deadHandlerId = EventPool.on(eventName, deadHandler!);

    // Simulate the deadHandler being garbage collected by mocking WeakRef.deref()
    // This requires accessing the private 'events' map, which is generally discouraged
    // but necessary for testing the core WeakRef cleanup logic in a unit test.
    // A more robust approach might involve integration tests with --expose-gc.
    const eventsMap = (EventPool as any).events.get(eventName);
    const deadHandlerWeakRef = eventsMap.get(deadHandlerId);

    // Temporarily mock the deref method for the specific WeakRef instance
    const originalDeref = deadHandlerWeakRef.deref;
    deadHandlerWeakRef.deref = vi.fn(() => undefined); // Simulate GC'd

    // Ensure the handlerMap still has the dead handler's entry before sweep
    const handlerMap = (EventPool as any).handlerMap.get(eventName);
    expect(handlerMap.has(deadHandler)).toBe(true);

    EventPool.sweepDeadHandlers();

    // Verify the dead handler was removed from both maps
    expect(eventsMap.has(deadHandlerId)).toBe(false);
    expect(handlerMap.has(deadHandler)).toBe(false);

    // Restore original deref (good practice if mocking instances)
    deadHandlerWeakRef.deref = originalDeref;

    // Ensure the live handler is still present and works
    EventPool.emit(eventName, { message: 'still alive' });
    expect(liveHandler).toHaveBeenCalledOnce();
    expect(liveHandler).toHaveBeenCalledWith({ message: 'still alive' });

    // Ensure the dead handler is not called
    expect(deadHandler).not.toHaveBeenCalled();
  });

  it('should call gcDebug without throwing', () => {
    const eventName = 'debugEvent';
    const liveHandler = vi.fn(() => 'live');
    let deadHandler: ((data: any) => void) | null = vi.fn(() => 'dead');

    EventPool.on(eventName, liveHandler);
    const deadHandlerId = EventPool.on(eventName, deadHandler!);

    // Simulate deadHandler being GC'd
    const eventsMap = (EventPool as any).events.get(eventName);
    const deadHandlerWeakRef = eventsMap.get(deadHandlerId);
    const originalDeref = deadHandlerWeakRef.deref;
    deadHandlerWeakRef.deref = vi.fn(() => undefined); // Simulate GC'd
    deadHandler = null; // Make eligible for GC in reality

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    expect(() => EventPool.gcDebug()).not.toThrow();

    // Check for specific log messages to ensure branches are hit
    expect(consoleSpy).toHaveBeenCalledWith('======= EventPool.gcDebug() start =======');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`event: ${eventName}`));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`handler: ${liveHandler.name || 'anonymous function'}`));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('handler: [GC 已收回]'));
    expect(consoleSpy).toHaveBeenCalledWith('======= EventPool.gcDebug() end =======');

    // Restore
    deadHandlerWeakRef.deref = originalDeref;
    consoleSpy.mockRestore();
  });

  it('should throw an error when trying to instantiate EventPool', () => {
    expect(() => new (EventPool as any)()).toThrow('EventPool is a static class and cannot be instantiated.');
  });
});