import { HttpError } from './http';

/** 404 thrown by `Table.require`. Separate module avoids an http<->db import cycle. */
export class NotFoundError extends HttpError {
  constructor(message = 'Not found') {
    super(404, message);
  }
}
