import { useLingui } from '@lingui/react/macro';
import { MainButton } from 'twenty-ui/components/input';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type AuthorizeActionButtonsProps = {
  onAuthorize: () => void;
  onCancel: () => void;
  isLoading?: boolean;
};

const styles = stylex.create({
  buttonContainer: {
    display: 'grid',
    gap: spacing['--t-spacing-3'],
    gridTemplateColumns: `repeat(
    2,
    minmax(${spacing['--t-spacing-0']}, 1fr)
  )`,
    marginTop: spacing['--t-spacing-8'],
    width: '100%',
  },
});

export const AuthorizeActionButtons = ({
  onAuthorize,
  onCancel,
  isLoading,
}: AuthorizeActionButtonsProps) => {
  const { t } = useLingui();

  return (
    <div {...stylex.props(styles.buttonContainer)}>
      <MainButton
        elevated={false}
        onClick={onCancel}
        fullWidth
        disabled={isLoading}
        variant="outline"
      >{t`Cancel`}</MainButton>
      <MainButton
        elevated={false}
        onClick={onAuthorize}
        disabled={isLoading}
        fullWidth
      >
        {isLoading ? t`Authorizing...` : t`Authorize`}
      </MainButton>
    </div>
  );
};
