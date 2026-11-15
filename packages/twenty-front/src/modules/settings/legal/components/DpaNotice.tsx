import * as stylex from '@stylexjs/stylex';
import { InlineBanner } from 'twenty-ui/components/feedback';

const styles = stylex.create({
  banner: {
    maxWidth: '100%',
  },
});

type DpaNoticeProps = {
  text: string;
};

export const DpaNotice = ({ text }: DpaNoticeProps) => (
  <div>
    <InlineBanner
      layout="compact"
      status="warning"
      {...stylex.props(styles.banner)}
    >
      {text}
    </InlineBanner>
  </div>
);
