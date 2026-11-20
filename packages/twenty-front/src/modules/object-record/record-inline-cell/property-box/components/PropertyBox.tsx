import { useLayoutRenderingContext } from '@/ui/layout/contexts/LayoutRenderingContext';
import * as stylex from '@stylexjs/stylex';
import { borderRadius, spacing } from 'twenty-ui/theme/tokens.stylex';
import { PageLayoutType } from '~/generated-metadata/graphql';

type PropertyBoxProps = {
  children: React.ReactNode;
  dataTestId?: string;
};

const styles = stylex.create({
  container: {
    borderRadius: borderRadius['--t-border-radius-md'],
    gap: spacing['--t-spacing-2'],
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-3'],
  },
  noHorizontalPadding: {
    paddingLeft: 0,
    paddingRight: 0,
  },
});

export const PropertyBox = ({ children, dataTestId }: PropertyBoxProps) => {
  const layoutRenderingContext = useLayoutRenderingContext();

  const isInRecordPageLayout =
    layoutRenderingContext.layoutType === PageLayoutType.RECORD_PAGE;

  return (
    <div
      data-testid={dataTestId}
      {...stylex.props(
        styles.container,
        isInRecordPageLayout && styles.noHorizontalPadding,
      )}
    >
      {children}
    </div>
  );
};
