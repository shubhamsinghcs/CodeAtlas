import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getAiConfig } from './config';
import { getCachedResponse, setCachedResponse, CacheContext } from './cache';
import { DatabaseClient } from '@codeatlas/database';

export async function generateStructuredJson<T>(
  dbClient: DatabaseClient,
  prompt: string,
  schema: z.ZodType<T>,
  context: CacheContext
): Promise<T | null> {
  const config = getAiConfig();

  if (!config.provider && !config.baseUrl) {
    console.warn('AI configuration missing. Bypassing AI generation gracefully.');
    return null;
  }

  const model = config.model || 'gpt-4o';
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  const apiKey = config.apiKey || '';

  // Inject model into context so cache uses the selected model
  const effectiveContext = { ...context, model };

  const cached = await getCachedResponse(dbClient, effectiveContext, prompt);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return schema.parse(parsed);
    } catch {
      console.warn('Cached AI response was malformed. Re-fetching.');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSchema = zodToJsonSchema(schema as any, 'ResponseSchema');
  const systemPrompt = `You are an expert software architect AI. Return your output STRICTLY as a valid JSON object adhering to the following JSON Schema. Do NOT include Markdown formatting like \`\`\`json. Only output the raw JSON object.\n\n${JSON.stringify(jsonSchema, null, 2)}`;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`AI Provider error (${res.status}):`, errorText);
      return null;
    }

    const data = await res.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error('Empty response from AI provider');
      return null;
    }

    let parsed;
    try {
      // In case the model still outputs markdown wrappers
      const cleanContent = content.replace(/^```json/, '').replace(/```$/, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      console.error('Failed to parse AI output as JSON:', content);
      return null;
    }

    const validated = schema.parse(parsed);

    // Save to cache
    await setCachedResponse(dbClient, effectiveContext, prompt, JSON.stringify(validated));

    return validated;
  } catch (err) {
    console.error('AI generation failed or produced malformed JSON:', err);
    return null;
  }
}
