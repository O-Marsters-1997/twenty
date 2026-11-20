import { isNonEmptyString } from '@sniptt/guards';

import { getSafeUrl } from 'twenty-shared/utils';
import { linkifyText } from './linkifyText';
import * as stylex from '@stylexjs/stylex';
import { color } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  link: {
    textDecoration: 'underline',
    color: color['--t-color-blue'],
    textDecorationColor: { default: null, ':hover': color['--t-color-blue'] },
  },
});

type LinkifiedTextProps = {
  text: string;
};

export const LinkifiedText = ({ text }: LinkifiedTextProps) => {
  if (!isNonEmptyString(text)) {
    return null;
  }

  return (
    <>
      {linkifyText(text).map((part, index) =>
        part.type === 'link' ? (
          <a
            key={index}
            href={getSafeUrl(part.content)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            {...stylex.props(styles.link)}
          >
            {part.content}
          </a>
        ) : (
          part.content
        ),
      )}
    </>
  );
};
