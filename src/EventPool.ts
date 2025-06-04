// Map(events)
// {
//   Map(event1): {
//     Symbol(eventId1): WeakRef(handler1),
//     Symbol(eventId2): WeakRef(handler2),
//   }
//   Map(event2): {
//     Symbol(eventId3): WeakRef(handler3),
//     Symbol(eventId4): WeakRef(handler4),
//   }
// }

// Map(handlerMap)
// {
//   Map(event1): {
//     handler1: Symbol(eventId1),
//     handler2: Symbol(eventId2),
//   }
//   Map(event2): {
//     handler3: Symbol(eventId3),
//     handler4: Symbol(eventId4),
//   }
// }

type Handler<T = any> = (...args: T[]) => any;

export default class EventPool {
  private static events = new Map<string, Map<symbol, WeakRef<Handler>>>();
  private static handlerMap = new Map<string, Map<Handler, symbol>>();

  private constructor() {
    throw new Error("EventPool is a static class and cannot be instantiated.");
  }

  private static cleanDeadHandlers(event: string): void {
    if (!this.events.has(event) || !this.handlerMap.has(event)) return;

    const eventMap = this.events.get(event)!;
    const handlerMap = this.handlerMap.get(event)!;
    const deadEventIds: symbol[] = [];

    for (const [eventId, weakRef] of eventMap.entries()) {
      if (!weakRef.deref()) {
        deadEventIds.push(eventId);
      }
    }

    for (const eventId of deadEventIds) {
      eventMap.delete(eventId);

      for (const [handler, id] of handlerMap.entries()) {
        if (id === eventId) {
          handlerMap.delete(handler);
          break;
        }
      }
    }
  }

  static on<T = any>(event: string, handler: Handler<T>): symbol {
    if (!this.events.has(event)) this.events.set(event, new Map());
    if (!this.handlerMap.has(event)) this.handlerMap.set(event, new Map());

    const eventId = Symbol(event);

    const eventMap = this.events.get(event)!;
    eventMap.set(eventId, new WeakRef(handler));

    const handlerMap = this.handlerMap.get(event)!;
    handlerMap.set(handler, eventId);

    return eventId;
  }

  static once<T = any>(event: string, handler: Handler<T>): symbol {
    const onceHandler: Handler<T> = (...args: T[]) => {
      handler && handler(...args);
      this.off(event, onceHandler);
    }

    return this.on(event, onceHandler);
  }

  static off<T = any>(event: string, handler: Handler<T>): void {
    if (!this.events.has(event) || !this.handlerMap.has(event)) return;

    const handlerMap = this.handlerMap.get(event)!;
    const eventId = handlerMap.get(handler);

    if (!eventId) return;

    const eventMap = this.events.get(event)!;
    eventMap.delete(eventId);
    handlerMap.delete(handler);
  }

  static offById(eventId: symbol): void {
    for (const [event, eventMap] of this.events.entries()) {
      if (eventMap.has(eventId)) {
        const handlerMap = this.handlerMap.get(event)!;
        const handler = eventMap.get(eventId)?.deref();

        if (handler && handlerMap) handlerMap.delete(handler);
        eventMap.delete(eventId);

        return;
      }
    }
  }

  static removeAll(): void {
    this.events.clear();
    this.handlerMap.clear();
  }

  static removeAllListeners(event: string): void {
    this.events.delete(event);
    this.handlerMap.delete(event);
  }

  static emit<T = any>(event: string, ...args: T[]): void {
    this.cleanDeadHandlers(event);

    if (!this.events.has(event)) return;

    const eventMap = this.events.get(event)!;
    for (const [_, weakRef] of eventMap.entries()) {
      const handler = weakRef.deref();
      handler && handler(...args);
    }
  }

  static sweepDeadHandlers(): void {
    for (const event of this.events.keys()) {
      this.cleanDeadHandlers(event);
    }
  }

  static gcDebug(): void {
     console.log('======= EventPool.gcDebug() start =======');
    for (const [event, map] of this.events.entries()) {
      for (const [eventId, handlerRef] of map.entries()) {
        const handler = handlerRef.deref();
        if (handler) {
          console.log(`event: ${event} | eventId: ${eventId.toString()} | handler: ${handler.name || 'anonymous function'}`); // Improved handler output
        } else {
          console.log(`event: ${event} | eventId: ${eventId.toString()} | handler: [GC 已收回]`);
        }
      }
    }
    console.log('======= EventPool.gcDebug() end =======');
  }
}
