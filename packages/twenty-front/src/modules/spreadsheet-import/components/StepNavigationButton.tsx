import { Dialog } from 'twenty-ui/primitives/surfaces';
import * as stylex from '@stylexjs/stylex';
import { borderColor, boxShadow, spacing } from 'twenty-ui/theme/tokens.stylex';
import { MainButton } from 'twenty-ui/components/input';

import { t } from '@lingui/core/macro';
import { Loader } from 'twenty-ui/primitives/feedback';
import { isDefined } from 'twenty-shared/utils';

type StepNavigationButtonProps = {
  onContinue?: () => void;
  continueTitle?: string;
  isContinueDisabled?: boolean;
  isLoading?: boolean;
  onBack?: () => void;
  backTitle?: string;
};

export const StepNavigationButton = ({
  onContinue,
  continueTitle = t`Continue`,
  isLoading,
  onBack,
  backTitle = t`Back`,
  isContinueDisabled = false,
}: StepNavigationButtonProps) => {
  return (
    <Dialog.Footer {...stylex.props(styles.footer)}>
      {isDefined(onBack) && (
        <MainButton
          startIcon={isLoading ? <Loader /> : undefined}
          onClick={!isLoading ? onBack : undefined}
          variant="outline"
        >
          {backTitle}
        </MainButton>
      )}
      {isDefined(onContinue) && (
        <MainButton
          startIcon={isLoading ? <Loader /> : undefined}
          onClick={!isLoading ? onContinue : undefined}
          disabled={isContinueDisabled}
        >
          {continueTitle}
        </MainButton>
      )}
    </Dialog.Footer>
  );
};

const styles = stylex.create({
  footer: {
    paddingBlock: spacing['--t-spacing-5'],
    paddingInline: spacing['--t-spacing-5'],
    boxShadow: boxShadow['--t-box-shadow-strong'],
    justifyContent: 'space-between',
    borderTopColor: borderColor['--t-border-color-medium'],
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
  },
});
