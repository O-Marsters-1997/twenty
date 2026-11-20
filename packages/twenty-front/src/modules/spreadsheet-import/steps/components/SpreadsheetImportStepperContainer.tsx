import { Dialog } from 'twenty-ui/primitives/surfaces';
import { useSpreadsheetImportInitialStep } from '@/spreadsheet-import/hooks/useSpreadsheetImportInitialStep';
import { useSpreadsheetImportInternal } from '@/spreadsheet-import/hooks/useSpreadsheetImportInternal';
import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';
import {
  background,
  borderColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

import { StepBar } from '@/ui/navigation/step-bar/components/StepBar';
import { useStepBar } from '@/ui/navigation/step-bar/hooks/useStepBar';

import { spreadsheetImportDialogState } from '@/spreadsheet-import/states/spreadsheetImportDialogState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { SpreadsheetImportStepper } from './SpreadsheetImportStepper';

export const SpreadsheetImportStepperContainer = () => {
  const { t } = useLingui();

  const spreadsheetImportDialog = useAtomStateValue(
    spreadsheetImportDialogState,
  );

  const stepTitles = {
    uploadStep: t`Upload File`,
    matchColumnsStep: t`Match Columns`,
    validationStep: t`Validate Data`,
  };

  const { initialStepState } = useSpreadsheetImportInternal();

  const { steps, initialStep } = useSpreadsheetImportInitialStep(
    initialStepState?.type,
  );

  const { nextStep, prevStep, activeStep } = useStepBar({
    initialStep,
  });

  return (
    <>
      <Dialog.Header {...stylex.props(styles.header)}>
        {spreadsheetImportDialog.isStepBarVisible && (
          <StepBar activeStep={activeStep}>
            {steps.map((key) => (
              <StepBar.Step
                activeStep={activeStep}
                label={stepTitles[key]}
                key={key}
              />
            ))}
          </StepBar>
        )}
      </Dialog.Header>
      <SpreadsheetImportStepper nextStep={nextStep} prevStep={prevStep} />
    </>
  );
};

const styles = stylex.create({
  header: {
    background: background['--t-background-secondary'],
    paddingBlock: 0,
    paddingInline: {
      default: spacing['--t-spacing-30'],
      [media.mobile]: spacing['--t-spacing-4'],
    },
    alignItems: 'center',
    flexDirection: 'row',
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    height: '60px',
  },
});
