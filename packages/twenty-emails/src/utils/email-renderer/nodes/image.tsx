import { Column, Link, Row } from 'react-email';
import { type JSONContent } from '@tiptap/core';
import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { safeUrl } from 'src/utils/email-renderer/utils/safe-url';

export const image = (node: JSONContent): ReactNode => {
  const { src: rawSrc, alt, align = 'left', width, href } = node?.attrs || {};
  const src = safeUrl(rawSrc);
  if (!isDefined(src)) {
    return null;
  }

  const imageElement = (
    <img
      src={src}
      alt={alt}
      className="block h-auto max-w-full border-none no-underline outline-none"
      style={{ width: isDefined(width) ? width : 'auto' }}
    />
  );

  return (
    <Row>
      <Column align={align}>
        {isDefined(safeUrl(href)) ? (
          <Link href={safeUrl(href)} target="_blank">
            {imageElement}
          </Link>
        ) : (
          imageElement
        )}
      </Column>
    </Row>
  );
};
