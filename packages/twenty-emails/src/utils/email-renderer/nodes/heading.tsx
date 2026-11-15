import { Heading } from 'react-email';
import { type JSONContent } from '@tiptap/core';
import { type ReactNode } from 'react';
import { mappedNodeContent } from 'src/utils/email-renderer/renderers/render-node';
import { blockStyle } from 'src/utils/email-renderer/utils/block-style';
import { type InheritedTypography } from 'src/utils/email-renderer/utils/inherited-typography';
import { isDefined } from 'twenty-shared/utils';

type HeadingLevel = 1 | 2 | 3;

type HeadingStyle = {
  element: 'h1' | 'h2' | 'h3';
  className: string;
};

const HEADING_STYLES: Record<HeadingLevel, HeadingStyle> = {
  1: { element: 'h1', className: 'text-[32px]' },
  2: { element: 'h2', className: 'text-xl' },
  3: { element: 'h3', className: 'text-lg' },
};

export const heading = (
  node: JSONContent,
  inherited: InheritedTypography = {},
): ReactNode => {
  const { level } = node?.attrs || {};

  if (!isDefined(level) || !HEADING_STYLES[level as HeadingLevel]) {
    return null;
  }

  const content = mappedNodeContent(node, inherited);
  const { element, className } = HEADING_STYLES[level as HeadingLevel];

  const { fontSize: _inheritedFontSize, ...inheritedWithoutSize } = inherited;

  return (
    <Heading
      as={element}
      className={className}
      style={{
        ...inheritedWithoutSize,
        ...blockStyle(node.attrs?.style),
      }}
    >
      {content}
    </Heading>
  );
};
