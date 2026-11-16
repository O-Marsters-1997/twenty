import { Text } from 'react-email';
import { type JSONContent } from '@tiptap/core';
import { type ReactNode } from 'react';
import { mappedNodeContent } from 'src/utils/email-renderer/renderers/render-node';
import { blockStyle } from 'src/utils/email-renderer/utils/block-style';
import { type InheritedTypography } from 'src/utils/email-renderer/utils/inherited-typography';

export const paragraph = (
  node: JSONContent,
  inherited: InheritedTypography = {},
): ReactNode => {
  const content = mappedNodeContent(node, inherited);

  return (
    <Text
      className="m-0 p-0 leading-normal"
      style={{
        ...inherited,
        ...blockStyle(node.attrs?.style),
      }}
    >
      {content.length === 0 ? <>&nbsp;</> : content}
    </Text>
  );
};
