import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type SettingsPaginationControlsProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  hasNextPage?: boolean;
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'flex-end',
    paddingTop: spacing['--t-spacing-2'],
  },
});

export const SettingsPaginationControls = ({
  page,
  pageCount,
  onPageChange,
  isLoading = false,
  hasNextPage,
}: SettingsPaginationControlsProps) => {
  const { t } = useLingui();

  const isNextDisabled = isDefined(hasNextPage)
    ? !hasNextPage
    : page + 1 >= pageCount;

  return (
    <div {...stylex.props(styles.container)}>
      <Button
        size="sm"
        disabled={page === 0 || isLoading}
        onClick={() => onPageChange(page - 1)}
        variant="outline"
      >{t`Previous`}</Button>
      <div>{t`Page ${page + 1} of ${pageCount}`}</div>
      <Button
        size="sm"
        disabled={isNextDisabled || isLoading}
        onClick={() => onPageChange(page + 1)}
        variant="outline"
      >{t`Next`}</Button>
    </div>
  );
};
