/**
 * Fake socket.io for the demo. `getChatSocket()` & friends return a
 * `DemoSocket` instead of connecting anywhere. Feature code listens with
 * `socket.on(event, cb)` and emits with `socket.emit(event, payload, ack?)`
 * exactly as against the real server.
 *
 * Server side (the simulated backend), use:
 *   onClientEmit('/chat', 'message:send', (payload, ack, sock) => { ... });
 *   pushToClients('/chat', 'message:new', message);          // all sockets in ns
 *   pushToClients('/chat', 'typing', data, { room: channelId });
 */
import type { Socket } from 'socket.io-client';

export type Namespace = '/chat' | '/voice' | '/notifications';
type Fn = (...args: any[]) => void;

type ServerHandler = (payload: any, ack: ((...a: any[]) => void) | undefined, socket: DemoSocket) => void;

const sockets = new Set<DemoSocket>();
const serverHandlers = new Map<string, ServerHandler[]>(); // `${ns}\0${event}`
const connectListeners: ((s: DemoSocket) => void)[] = [];

export class DemoSocket {
  connected = true;
  disconnected = false;
  active = true;
  id = `demo-sock-${Math.random().toString(36).slice(2, 10)}`;
  /** Rooms joined via `join` helpers (server side). */
  rooms = new Set<string>();
  auth: Record<string, unknown> = {};
  /** socket.io Manager surface used by a few callers (`socket.io.on('reconnect', …)`). */
  io = {
    on: (_e: string, _f: Fn) => this.io,
    off: (_e: string, _f?: Fn) => this.io,
    once: (_e: string, _f: Fn) => this.io,
    opts: {},
  };
  private handlers = new Map<string, Set<Fn>>();
  private anyHandlers = new Set<Fn>();

  constructor(readonly nsp: Namespace) {
    sockets.add(this);
    // Fire `connect` on the next tick so listeners attached right after creation hear it.
    setTimeout(() => {
      this.dispatch('connect');
      for (const l of connectListeners) l(this);
    }, 0);
  }

  on(event: string, fn: Fn) {
    let s = this.handlers.get(event);
    if (!s) this.handlers.set(event, (s = new Set()));
    s.add(fn);
    // socket.io clients that attach `connect` after we're already connected
    if (event === 'connect' && this.connected) setTimeout(() => fn(), 0);
    return this;
  }
  addListener(event: string, fn: Fn) {
    return this.on(event, fn);
  }
  once(event: string, fn: Fn) {
    const wrap: Fn = (...a) => {
      this.off(event, wrap);
      fn(...a);
    };
    return this.on(event, wrap);
  }
  off(event?: string, fn?: Fn) {
    if (!event) this.handlers.clear();
    else if (!fn) this.handlers.delete(event);
    else this.handlers.get(event)?.delete(fn);
    return this;
  }
  removeListener(event: string, fn?: Fn) {
    return this.off(event, fn);
  }
  removeAllListeners(event?: string) {
    return this.off(event);
  }
  listeners(event: string): Fn[] {
    return Array.from(this.handlers.get(event) ?? []);
  }
  hasListeners(event: string): boolean {
    return (this.handlers.get(event)?.size ?? 0) > 0;
  }
  onAny(fn: Fn) {
    this.anyHandlers.add(fn);
    return this;
  }
  offAny(fn?: Fn) {
    if (fn) this.anyHandlers.delete(fn);
    else this.anyHandlers.clear();
    return this;
  }
  get volatile() {
    return this;
  }
  get compress() {
    return () => this;
  }
  timeout() {
    return this;
  }

  /** Client → server. Supports the trailing-ack-callback convention. */
  emit(event: string, ...args: any[]) {
    let ack: ((...a: any[]) => void) | undefined;
    if (typeof args[args.length - 1] === 'function') ack = args.pop();
    const hs = serverHandlers.get(`${this.nsp}\0${event}`);
    if (hs && hs.length) {
      // Deliver asynchronously like a real network hop.
      setTimeout(() => {
        for (const h of hs) {
          try {
            h(args[0], ack, this);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[demo socket]', event, e);
          }
        }
      }, 20);
    } else if (ack) {
      setTimeout(() => ack!({ ok: true }), 20);
    }
    return this;
  }
  send(...args: any[]) {
    return this.emit('message', ...args);
  }

  connect() {
    if (!this.connected) {
      this.connected = true;
      this.disconnected = false;
      this.dispatch('connect');
    }
    return this;
  }
  open() {
    return this.connect();
  }
  disconnect() {
    if (this.connected) {
      this.connected = false;
      this.disconnected = true;
      this.dispatch('disconnect', 'io client disconnect');
    }
    return this;
  }
  close() {
    return this.disconnect();
  }

  /** Server → client (used by `pushToClients`). */
  dispatch(event: string, ...args: any[]) {
    for (const f of this.anyHandlers) f(event, ...args);
    const hs = this.handlers.get(event);
    if (!hs) return;
    for (const f of Array.from(hs)) {
      try {
        f(...args);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[demo socket listener]', event, e);
      }
    }
  }

  asSocket(): Socket {
    return this as unknown as Socket;
  }
}

export function createDemoSocket(ns: Namespace): Socket {
  return new DemoSocket(ns).asSocket();
}

/** Register a simulated-server handler for a client-emitted event. */
export function onClientEmit(ns: Namespace, event: string, handler: ServerHandler): void {
  const k = `${ns}\0${event}`;
  const list = serverHandlers.get(k) ?? [];
  list.push(handler);
  serverHandlers.set(k, list);
}

/** Called whenever a new client socket connects (e.g. to send an initial presence snapshot). */
export function onSocketConnect(fn: (s: DemoSocket) => void): void {
  connectListeners.push(fn);
}

/** Server → clients broadcast. With `room`, only sockets that joined it (see `joinRoom`). */
export function pushToClients(
  ns: Namespace,
  event: string,
  payload?: unknown,
  opts: { room?: string; delayMs?: number } = {},
): void {
  const send = () => {
    for (const s of sockets) {
      if (s.nsp !== ns || !s.connected) continue;
      if (opts.room && !s.rooms.has(opts.room)) continue;
      s.dispatch(event, payload);
    }
  };
  if (opts.delayMs) setTimeout(send, opts.delayMs);
  else send();
}

export function joinRoom(socket: DemoSocket, room: string): void {
  socket.rooms.add(room);
}
export function leaveRoom(socket: DemoSocket, room: string): void {
  socket.rooms.delete(room);
}

export function connectedSockets(ns: Namespace): DemoSocket[] {
  return Array.from(sockets).filter((s) => s.nsp === ns && s.connected);
}

/** Drop closed sockets (called by the real `disconnect*` helpers). */
export function forgetSocket(sock: unknown): void {
  sockets.delete(sock as DemoSocket);
}
