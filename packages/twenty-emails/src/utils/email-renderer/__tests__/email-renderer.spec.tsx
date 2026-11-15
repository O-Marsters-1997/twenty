import { type JSONContent } from '@tiptap/core';

import { reactMarkupFromJSON } from 'src/utils/email-renderer/email-renderer';
import { renderEmail } from 'src/utils/render-email';

const text = (value: string, marks?: JSONContent['marks']): JSONContent => ({
  type: 'text',
  text: value,
  ...(marks ? { marks } : {}),
});

const paragraph = (...content: JSONContent[]): JSONContent => ({
  type: 'paragraph',
  content,
});

const listItem = (value: string): JSONContent => ({
  type: 'listItem',
  content: [paragraph(text(value))],
});

const DOCUMENT_CONTENT: JSONContent[] = [
  { type: 'heading', attrs: { level: 1 }, content: [text('Title')] },
  { type: 'heading', attrs: { level: 2 }, content: [text('Subtitle')] },
  { type: 'heading', attrs: { level: 3 }, content: [text('Small')] },
  paragraph(
    text('Plain '),
    text('bold', [{ type: 'bold' }]),
    text('italic', [{ type: 'italic' }]),
    text('underline', [{ type: 'underline' }]),
    text('strike', [{ type: 'strike' }]),
    text('link', [{ type: 'link', attrs: { href: 'https://twenty.com' } }]),
    { type: 'hardBreak' },
    { type: 'variableTag', attrs: { variable: '{{firstName}}' } },
  ),
  paragraph(),
  { type: 'bulletList', content: [listItem('one'), listItem('two')] },
  { type: 'orderedList', content: [listItem('first'), listItem('second')] },
  {
    type: 'image',
    attrs: {
      src: 'https://twenty.com/a.png',
      alt: 'a',
      href: 'https://twenty.com',
    },
  },
  {
    type: 'button',
    attrs: { href: 'https://twenty.com', align: 'center' },
    content: [text('Click')],
  },
  { type: 'divider' },
  { type: 'html', attrs: { html: '<p>raw</p>' } },
  {
    type: 'section',
    attrs: { style: { backgroundColor: '#eeeeee', color: '#112233' } },
    content: [paragraph(text('in section'))],
  },
  {
    type: 'columns',
    content: [
      { type: 'column', content: [paragraph(text('left'))] },
      { type: 'column', content: [paragraph(text('right'))] },
    ],
  },
];

const render = (document: JSONContent) =>
  renderEmail(reactMarkupFromJSON(document) as React.ReactElement);

describe('reactMarkupFromJSON', () => {
  it('renders every node and mark type to stable HTML', async () => {
    expect(
      await render({ type: 'doc', content: DOCUMENT_CONTENT }),
    ).toMatchSnapshot();
  });

  it('keeps document and theme values inline', async () => {
    const html = await render({
      type: 'doc',
      attrs: {
        canvasTheme: {
          pageBackground: '#abcdef',
          bodyBackground: '#fedcba',
          width: '480px',
          textAlign: 'center',
        },
      },
      content: [
        {
          type: 'paragraph',
          attrs: { style: { color: '#123456', fontSize: '19px' } },
          content: [text('styled')],
        },
        {
          type: 'button',
          attrs: {
            href: 'https://twenty.com',
            style: { backgroundColor: '#654321' },
          },
          content: [text('Go')],
        },
      ],
    });

    expect(html).toContain('background-color:#abcdef');
    expect(html).toContain('background-color:#fedcba');
    expect(html).toContain('max-width:480px');
    expect(html).toContain('color:#123456');
    expect(html).toContain('font-size:19px');
    expect(html).toContain('background-color:#654321');
    expect(html).toMatchSnapshot();
  });
});
