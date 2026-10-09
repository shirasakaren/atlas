/**
 * The in-browser "server": seeds + handlers. Loaded lazily (dynamic import)
 * so the data/word-bank modules stay out of the initial bundle.
 */
import './seed';
import './handlers';
import { dbReady } from './db';
import { HttpError, matchRoute, NO_CONTENT, type Method, type Req } from './http';

export interface EngineResponse {
  status: number;
  body: unknown | typeof NO_CONTENT;
}

export async function dispatch(
  method: string,
  pathWithQuery: string,
  rawBody: unknown,
  headers: Headers,
): Promise<EngineResponse> {
  await dbReady();
  const qIdx = pathWithQuery.indexOf('?');
  const path = qIdx === -1 ? pathWithQuery : pathWithQuery.slice(0, qIdx);
  const query = new URLSearchParams(qIdx === -1 ? '' : pathWithQuery.slice(qIdx + 1));
  const m = matchRoute(method, path);
  if (!m) {
    // eslint-disable-next-line no-console
    console.warn(`[demo] no handler for ${method} ${path}`);
    return { status: 404, body: { statusCode: 404, message: `Not available in the demo: ${method} ${path}` } };
  }
  const req: Req = { method: method as Method, path, params: m.params, query, body: rawBody, headers };
  try {
    const out = await m.handler(req);
    if (out === NO_CONTENT || out === undefined) return { status: 204, body: NO_CONTENT };
    // Deep-copy so the UI can never mutate the database through a response object.
    return { status: method === 'POST' ? 201 : 200, body: JSON.parse(JSON.stringify(out)) };
  } catch (e) {
    if (e instanceof HttpError) {
      return { status: e.status, body: { statusCode: e.status, message: e.message, ...e.extra } };
    }
    // eslint-disable-next-line no-console
    console.error(`[demo] handler crashed: ${method} ${path}`, e);
    return { status: 500, body: { statusCode: 500, message: 'Demo handler error: ' + (e as Error).message } };
  }
}

export { listRoutes } from './http';
