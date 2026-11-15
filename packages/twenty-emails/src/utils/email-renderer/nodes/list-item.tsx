import { type JSONContent } from '@tiptap/core';
import { type ReactNode } from 'react';
import { mappedNodeContent } from 'src/utils/email-renderer/renderers/render-node';
import { type InheritedTypography } from 'src/utils/email-renderer/utils/inherited-typography';

export const listItem = (
  node: JSONContent,
  inherited: InheritedTypography = {},
): ReactNode => {
  return (
    <li
      className="mb-2 leading-normal"
      style={inherited}
    >
      {mappedNodeContent(node, inherited)}
    </li>
  );
};
