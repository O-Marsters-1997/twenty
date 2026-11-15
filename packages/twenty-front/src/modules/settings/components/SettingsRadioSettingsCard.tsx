import { styled } from '@linaria/react';
import { type MessageDescriptor } from '@lingui/core';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode, useId } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Radio, RadioGroup } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing, font } from 'twenty-ui/theme/tokens.stylex';

type SettingsRadioSettingsCardProps<Option extends { value: string }> = {
  name: string;
  onChange: (nextValue: Option['value']) => void;
  options: Option[];
  value: Option['value'];
  disabled?: boolean;
};

const StyledCardContentContainer = styled.div`
  > div {
    cursor: pointer;

    &:hover {
      background: ${themeCssVariables.background.transparent.lighter};
    }
  }
`;

const styles = stylex.create({
  optionHeader: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-4'],
  },
  textContainer: {
    flex: '1',
    minWidth: '0',
  },
  title: {
    color: font['--t-font-color-primary'],
    fontWeight: font['--t-font-weight-medium'],
    marginBottom: spacing['--t-spacing-2'],
  },
  description: {
    color: font['--t-font-color-tertiary'],
    fontSize: font['--t-font-size-sm'],
  },
  radioContainer: {
    alignItems: 'center',
    display: 'flex',
    marginLeft: 'auto',
  },
  expandedContent: {
    marginTop: spacing['--t-spacing-4'],
  },
});

export const SettingsRadioSettingsCard = <
  Option extends {
    cardMedia: ReactNode;
    description: MessageDescriptor;
    title: MessageDescriptor;
    value: string;
    cardContentExpanded?: ReactNode;
  },
>({
  name,
  onChange,
  options,
  value,
  disabled = false,
}: SettingsRadioSettingsCardProps<Option>) => {
  const groupId = useId();
  const { i18n } = useLingui();

  return (
    <RadioGroup
      name={name}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      onKeyDown={(event) => {
        if (
          !(event.target instanceof HTMLElement) ||
          event.target.getAttribute('role') !== 'radio'
        ) {
          event.preventBaseUIHandler();
        }
      }}
    >
      <Card.Root fullWidth rounded>
        {options.map((option, index) => {
          const isSelected = value === option.value;

          return (
            <StyledCardContentContainer key={option.value}>
              <Card.Content divider={index < options.length - 1}>
                <label {...stylex.props(styles.optionHeader)}>
                  {option.cardMedia}
                  <div {...stylex.props(styles.textContainer)}>
                    <div id={`${groupId}-${index}-title`} {...stylex.props(styles.title)}>
                      {i18n._(option.title)}
                    </div>
                    <div id={`${groupId}-${index}-description`} {...stylex.props(styles.description)}>
                      {i18n._(option.description)}
                    </div>
                  </div>
                  <span {...stylex.props(styles.radioContainer)}>
                    <Radio
                      aria-labelledby={`${groupId}-${index}-title`}
                      aria-describedby={`${groupId}-${index}-description`}
                      value={option.value}
                    />
                  </span>
                </label>
                {isDefined(option.cardContentExpanded) && isSelected && (
                  <div {...stylex.props(styles.expandedContent)}>
                    {option.cardContentExpanded}
                  </div>
                )}
              </Card.Content>
            </StyledCardContentContainer>
          );
        })}
      </Card.Root>
    </RadioGroup>
  );
};
