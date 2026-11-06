import { type ExtendedUIMessage } from 'twenty-shared/ai';

import { replaceUnsupportedFileParts } from 'src/engine/metadata-modules/ai/ai-agent-execution/utils/replace-unsupported-file-parts.util';

const buildFilePart = (mediaType: string, filename = 'file.bin') => ({
  type: 'file' as const,
  mediaType,
  filename,
  url: 'https://example.com/file',
  fileId: 'file-id',
});

const buildUserMessage = (
  parts: ExtendedUIMessage['parts'],
): ExtendedUIMessage => ({
  id: 'message-id',
  role: 'user',
  parts,
});

describe('replaceUnsupportedFileParts', () => {
  it('keeps file parts whose MIME type is in the native set', () => {
    const messages = [buildUserMessage([buildFilePart('image/png')])];

    const result = replaceUnsupportedFileParts(messages, ['image']);

    expect(result[0].parts[0]).toEqual(buildFilePart('image/png'));
  });

  it('replaces unsupported file parts with a text note', () => {
    const messages = [
      buildUserMessage([buildFilePart('video/mp4', 'clip.mp4')]),
    ];

    const result = replaceUnsupportedFileParts(messages, []);

    expect(result[0].parts[0]).toEqual({
      type: 'text',
      text: '[Attached file: clip.mp4 (type: video/mp4) — file type is not supported for direct analysis]',
    });
  });

  it('downgrades native-only files when the model declares no modalities', () => {
    const messages = [buildUserMessage([buildFilePart('image/png')])];

    const result = replaceUnsupportedFileParts(messages, []);

    expect(result[0].parts[0]).toMatchObject({ type: 'text' });
  });

  it('does not touch non-user messages', () => {
    const assistantMessage: ExtendedUIMessage = {
      id: 'assistant-id',
      role: 'assistant',
      parts: [{ type: 'text', text: 'hello' }],
    };

    const result = replaceUnsupportedFileParts([assistantMessage], []);

    expect(result[0]).toBe(assistantMessage);
  });
});
