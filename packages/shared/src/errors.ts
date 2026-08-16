export class CodeAtlasError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'CodeAtlasError';
  }
}

export class ConfigError extends CodeAtlasError {
  constructor(message: string, details?: unknown) {
    super('CONFIG_ERROR', message, details);
    this.name = 'ConfigError';
  }
}

export class ValidationError extends CodeAtlasError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class GitNotFoundError extends CodeAtlasError {
  constructor(message: string = 'Git is not installed or not available in PATH.', details?: unknown) {
    super('GIT_NOT_FOUND', message, details);
    this.name = 'GitNotFoundError';
  }
}

export class RepositoryNotFoundError extends CodeAtlasError {
  constructor(message: string, details?: unknown) {
    super('REPO_NOT_FOUND', message, details);
    this.name = 'RepositoryNotFoundError';
  }
}

export class UnsupportedRepositoryError extends CodeAtlasError {
  constructor(message: string, details?: unknown) {
    super('UNSUPPORTED_REPO', message, details);
    this.name = 'UnsupportedRepositoryError';
  }
}

export class EmptyRepositoryError extends CodeAtlasError {
  constructor(message: string, details?: unknown) {
    super('EMPTY_REPO', message, details);
    this.name = 'EmptyRepositoryError';
  }
}

export class DatabaseCorruptionError extends CodeAtlasError {
  constructor(message: string, details?: unknown) {
    super('DATABASE_CORRUPTION', message, details);
    this.name = 'DatabaseCorruptionError';
  }
}

export class NetworkFailureError extends CodeAtlasError {
  constructor(message: string, details?: unknown) {
    super('NETWORK_FAILURE', message, details);
    this.name = 'NetworkFailureError';
  }
}
