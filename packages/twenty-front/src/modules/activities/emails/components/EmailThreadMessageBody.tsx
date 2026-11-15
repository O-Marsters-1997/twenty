import * as stylex from '@stylexjs/stylex';
import Linkify from 'linkify-react';
import { Collapsible } from 'twenty-ui/primitives/layout';
import { borderColor, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  body: {
    color: fontColor['--t-font-color-primary'],
    marginTop: spacing['--t-spacing-4'],
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line',
  },
  link: {
    color: {
      default: fontColor['--t-font-color-primary'],
      ':hover': fontColor['--t-font-color-tertiary'],
    },
    textDecorationColor: {
      default: fontColor['--t-font-color-primary'],
      ':hover': borderColor['--t-border-color-strong'],
    },
    textDecorationLine: 'underline',
  },
});

type EmailThreadMessageBodyProps = {
  body: string;
  isDisplayed: boolean;
};

export const EmailThreadMessageBody = ({
  body,
  isDisplayed,
}: EmailThreadMessageBodyProps) => {
  return (
    <Collapsible.Root open={isDisplayed}>
      <Collapsible.Panel duration="fast">
        <div {...stylex.props(styles.body)}>
          <Linkify
            options={{
              target: '_blank',
              rel: 'noopener noreferrer',
              className: stylex.props(styles.link).className,
            }}
          >
            {body}
          </Linkify>
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
};
