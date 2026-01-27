type Listener = (...args: any[]) => void;

class SimpleEventEmitter {
  private events: { [key: string]: Listener[] } = {};

  on(event: string, listener: Listener): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    // Return an unsubscribe function
    return () => this.off(event, listener);
  }

  off(event: string, listener: Listener): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
}

// This is a global event emitter for handling specific app-wide events.
export const errorEmitter = new SimpleEventEmitter();
