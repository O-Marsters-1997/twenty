import { type ReactNode } from 'react';
import { Body, Container, Head, Html, Tailwind } from 'react-email';
import { type JSONContent } from '@tiptap/core';
import { type CanvasTheme, resolveCanvasTheme } from 'twenty-shared/utils';
import { EMAIL_TAILWIND_CONFIG } from 'src/tailwind.config';
import { mappedNodeContent } from 'src/utils/email-renderer/renderers/render-node';

const BASE_STYLE_RESET = `blockquote,h1,h2,h3,img,li,ol,p,ul{margin-top:0;margin-bottom:0}`;

const themedBody = (theme: CanvasTheme, children: ReactNode) => (
  <Body
    style={{
      backgroundColor: theme.pageBackground,
      color: theme.textColor,
      margin: 0,
      padding: theme.pagePadding,
    }}
  >
    <Container
      style={{
        backgroundColor: theme.bodyBackground || undefined,
        border:
          theme.borderWidth !== '' && theme.borderWidth !== '0px'
            ? `${theme.borderWidth} solid ${theme.borderColor}`
            : undefined,
        borderRadius: theme.cornerRadius,
        color: theme.textColor,
        maxWidth: theme.width,
        padding: theme.padding,
        textAlign: theme.textAlign,
      }}
    >
      {children}
    </Container>
  </Body>
);

export const reactMarkupFromJSON = (json: JSONContent | string) => {
  if (typeof json === 'string') {
    return json;
  }

  const jsxNodes = mappedNodeContent(json);
  const canvasTheme = resolveCanvasTheme(json.attrs?.canvasTheme);

  return (
    <Html>
      <Tailwind config={EMAIL_TAILWIND_CONFIG}>
        <Head>
          <style
            dangerouslySetInnerHTML={{
              __html: BASE_STYLE_RESET,
            }}
          />
        </Head>
        {canvasTheme !== null ? (
          themedBody(canvasTheme, jsxNodes)
        ) : (
          <Body>{jsxNodes}</Body>
        )}
      </Tailwind>
    </Html>
  );
};
