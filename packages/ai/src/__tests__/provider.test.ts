import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateStructuredJson } from '../provider';
import { z } from 'zod';
import * as configModule from '../config';
import * as cacheModule from '../cache';

const TestSchema = z.object({
  foo: z.string(),
  bar: z.number()
});

const mockContext = {
  repositoryId: 'repo-1',
  commitHash: 'abc1234',
  analysisType: 'test',
  model: 'test-model',
  schemaVersion: '1.0'
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDbClient: any = {};

describe('AI Provider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('bypasses gracefully when config is missing', async () => {
    vi.spyOn(configModule, 'getAiConfig').mockReturnValue({});
    
    const result = await generateStructuredJson(mockDbClient, 'hello', TestSchema, mockContext);
    expect(result).toBeNull();
  });

  it('returns cached response if available and valid', async () => {
    vi.spyOn(configModule, 'getAiConfig').mockReturnValue({ baseUrl: 'http://test', provider: 'test' });
    vi.spyOn(cacheModule, 'getCachedResponse').mockResolvedValue('{"foo": "baz", "bar": 42}');
    
    const result = await generateStructuredJson(mockDbClient, 'hello', TestSchema, mockContext);
    expect(result).toEqual({ foo: 'baz', bar: 42 });
  });

  it('refetches if cached response is malformed json', async () => {
    vi.spyOn(configModule, 'getAiConfig').mockReturnValue({ baseUrl: 'http://test', provider: 'test' });
    vi.spyOn(cacheModule, 'getCachedResponse').mockResolvedValue('{ invalid json');
    const setCacheSpy = vi.spyOn(cacheModule, 'setCachedResponse').mockResolvedValue();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"foo": "fresh", "bar": 1}' } }]
      })
    });

    const result = await generateStructuredJson(mockDbClient, 'hello', TestSchema, mockContext);
    expect(result).toEqual({ foo: 'fresh', bar: 1 });
    expect(setCacheSpy).toHaveBeenCalled();
  });

  it('refetches if cached response fails zod validation', async () => {
    vi.spyOn(configModule, 'getAiConfig').mockReturnValue({ baseUrl: 'http://test', provider: 'test' });
    vi.spyOn(cacheModule, 'getCachedResponse').mockResolvedValue('{"foo": 123, "bar": "string"}'); // Invalid types
    const setCacheSpy = vi.spyOn(cacheModule, 'setCachedResponse').mockResolvedValue();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"foo": "fresh", "bar": 1}' } }]
      })
    });

    const result = await generateStructuredJson(mockDbClient, 'hello', TestSchema, mockContext);
    expect(result).toEqual({ foo: 'fresh', bar: 1 });
    expect(setCacheSpy).toHaveBeenCalled();
  });

  it('returns null on fetch error', async () => {
    vi.spyOn(configModule, 'getAiConfig').mockReturnValue({ baseUrl: 'http://test', provider: 'test' });
    vi.spyOn(cacheModule, 'getCachedResponse').mockResolvedValue(null);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    });

    const result = await generateStructuredJson(mockDbClient, 'hello', TestSchema, mockContext);
    expect(result).toBeNull();
  });

  it('returns null on malformed AI response', async () => {
    vi.spyOn(configModule, 'getAiConfig').mockReturnValue({ baseUrl: 'http://test', provider: 'test' });
    vi.spyOn(cacheModule, 'getCachedResponse').mockResolvedValue(null);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'This is not json' } }]
      })
    });

    const result = await generateStructuredJson(mockDbClient, 'hello', TestSchema, mockContext);
    expect(result).toBeNull();
  });
});
