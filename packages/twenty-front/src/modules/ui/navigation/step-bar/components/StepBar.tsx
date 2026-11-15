import React from 'react';

import { useIsMobile } from 'twenty-ui/utilities';

import { Step, type StepProps } from './Step';
import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flex: '1',
    justifyContent: { default: 'space-between', [media.mobile]: 'center' },
    alignItems: { default: null, [media.mobile]: 'center' },
  },
});

export type StepBarProps = React.PropsWithChildren &
  React.ComponentProps<'div'> & {
    activeStep: number;
  };

export const StepBar = ({ activeStep, children }: StepBarProps) => {
  const isMobile = useIsMobile();

  return (
    <div {...stylex.props(styles.container)}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) {
          return null;
        }

        // oxlint-disable-next-line typescript/ban-ts-comment
        // @ts-expect-error
        if (child.type?.displayName !== Step.displayName) {
          return child;
        }

        // We should only render the active step, and if activeStep is -1, we should only render the first step only when it's mobile device
        if (
          isMobile &&
          (activeStep === -1 ? index !== 0 : index !== activeStep)
        ) {
          return null;
        }

        return React.cloneElement<StepProps>(child as any, {
          index,
          isLast: index === React.Children.count(children) - 1,
          activeStep,
        });
      })}
    </div>
  );
};

StepBar.Step = Step;
