export class TmdbError extends Error {
  constructor(public status: number, message: string) {
    super(`TMDB API Error (${status}): ${message}`);
    this.name = 'TmdbError';
  }
}

export class JikanError extends Error {
  constructor(public status: number, message: string) {
    super(`Jikan API Error (${status}): ${message}`);
    this.name = 'JikanError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string, public existing?: unknown) {
    super(message);
    this.name = 'ConflictError';
  }
}
