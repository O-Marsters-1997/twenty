import { AnimatedContainer } from '@/ui/layout/animation/components/internal/AnimatedContainer/AnimatedContainer';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { type IconComponent } from 'twenty-ui/icon';
import { ButtonGroup } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  buttonContainer: {
    '--tw-button-radius': `calc(${borderRadius['--t-border-radius-sm']} - 1px)`,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-strong'],
    position: { default: null, [media.mobile]: 'relative' },
    right: { default: null, [media.mobile]: '7px' },
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    marginTop: spacing['--t-spacing-1'],
    marginRight: spacing['--t-spacing-1'],
    marginBottom: spacing['--t-spacing-1'],
    marginLeft: spacing['--t-spacing-1'],
  },
});

type RecordTableCellButtonsProps = {
  onClick?: () => void;
  Icon: IconComponent;
  ariaLabel: string;
}[];

export const RecordTableCellButtons = ({
  buttons,
}: {
  buttons: RecordTableCellButtonsProps;
}) => {
  const { t } = useLingui();

  return (
    <AnimatedContainer>
      <div {...stylex.props(styles.buttonContainer)}>
        <ButtonGroup aria-label={t`Cell controls`} attached={false}>
          {buttons.map(({ Icon, onClick, ariaLabel }, index) => (
            <LightIconButton
              key={index}
              aria-label={ariaLabel}
              onClick={onClick}
              disabled={!isDefined(onClick)}
            >
              <Icon />
            </LightIconButton>
          ))}
        </ButtonGroup>
      </div>
    </AnimatedContainer>
  );
};
