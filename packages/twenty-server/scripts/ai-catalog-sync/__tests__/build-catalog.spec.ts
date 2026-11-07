import { type ModelsDevData } from 'src/engine/metadata-modules/ai/ai-models/types/models-dev-data.type';

import { assertPayloadIsUsable } from '../utils/assert-payload-is-usable.util';
import { buildCatalog } from '../utils/build-catalog.util';

const languageModel = {
  id: 'model',
  name: 'Model',
  tool_call: true,
  cost: { input: 2, output: 6 },
  limit: { context: 128000, output: 8192 },
};

const VENDORS = ['openai', 'anthropic', 'google', 'xai', 'mistral'];

const payload = (): ModelsDevData => ({
  openai: { id: 'openai', models: { 'gpt-x': languageModel } },
  anthropic: { id: 'anthropic', models: { 'claude-x': languageModel } },
  google: { id: 'google', models: { 'gemini-x': languageModel } },
  xai: { id: 'xai', models: { 'grok-x': languageModel } },
  mistral: { id: 'mistral', models: { 'mistral-x': languageModel } },
});

describe('assertPayloadIsUsable', () => {
  it('accepts a payload carrying models for every vendor we ship', () => {
    expect(() =>
      assertPayloadIsUsable({ data: payload(), vendors: VENDORS }),
    ).not.toThrow();
  });

  it('refuses an empty payload rather than generating an empty catalog', () => {
    expect(() =>
      assertPayloadIsUsable({ data: {} as ModelsDevData, vendors: VENDORS }),
    ).toThrow(/refusing to overwrite the catalog/);
  });

  it('names the providers that came back empty', () => {
    const data = payload();

    data.anthropic.models = {};

    expect(() => assertPayloadIsUsable({ data, vendors: VENDORS })).toThrow(
      /anthropic/,
    );
  });
});

describe('buildCatalog', () => {
  it('emits limits but no token pricing', () => {
    const model = buildCatalog({ data: payload(), vendors: VENDORS }).openai
      .models[0];

    expect(model.contextWindowTokens).toBe(128000);
    expect(Object.keys(model).filter((key) => /cost/i.test(key))).toEqual([]);
  });
});
