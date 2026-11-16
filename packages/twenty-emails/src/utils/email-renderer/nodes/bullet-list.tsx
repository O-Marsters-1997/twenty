import { type JSONContent } from '@tiptap/core';
import { type ReactNode } from 'react';
import { mappedNodeContent } from 'src/utils/email-renderer/renderers/render-node';
import { type InheritedTypography } from 'src/utils/email-renderer/utils/inherited-typography';

export const bulletList = (
  node: JSONContent,
  inherited: InheritedTypography = {},
): ReactNode => {
  return (
    <ul
      className="mb-4 leading-normal"
      style={inherited}
    >
      {mappedNodeContent(node, inherited)}
    </ul>
  );
};
