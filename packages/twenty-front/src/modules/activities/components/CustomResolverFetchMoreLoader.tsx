import { t } from '@lingui/core/macro';
import { useInView } from 'react-intersection-observer';
import * as stylex from '@stylexjs/stylex';
import { grayScale, spacing } from 'twenty-ui/theme/tokens.stylex';

type CustomResolverFetchMoreLoaderProps = {
  loading: boolean;
  onLastRowVisible: (...args: any[]) => any;
};

const styles = stylex.create({
  container: {
    minHeight: '1px',
  },
  text: {
    alignItems: 'center',
    boxShadow: 'none',
    color: grayScale['--t-gray-scale-gray9'],
    display: 'flex',
    height: '32px',
    marginLeft: spacing['--t-spacing-8'],
    paddingLeft: spacing['--t-spacing-2'],
  },
});

export const CustomResolverFetchMoreLoader = ({
  loading,
  onLastRowVisible,
}: CustomResolverFetchMoreLoaderProps) => {
  const { ref: tbodyRef } = useInView({
    onChange: (inView) => {
      if (inView) {
        onLastRowVisible();
      }
    },
  });

  return (
    <div ref={tbodyRef} {...stylex.props(styles.container)}>
      {loading && <div {...stylex.props(styles.text)}>{t`Loading more...`}</div>}
    </div>
  );
};
