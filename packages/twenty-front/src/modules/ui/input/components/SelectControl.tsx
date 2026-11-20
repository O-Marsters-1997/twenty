import { type FormFieldInputVariant } from '@/ui/input/types/FormFieldInputVariant';
import { type SelectSizeVariant } from '@/ui/input/types/SelectSizeVariant';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { TintedIconTile } from 'twenty-ui/components/data-display';
import { IconChevronDown } from 'twenty-ui/icon';
import { Tag } from 'twenty-ui/primitives/data-display';
import { type SelectOption } from 'twenty-ui/primitives/input';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { useTheme } from 'twenty-ui/theme';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

export type SelectControlTextAccent = 'default' | 'placeholder';

type SelectControlContainerProps = {
  disabled?: boolean;
  hasIcon: boolean;
  selectSizeVariant?: SelectSizeVariant;
  textAccent: SelectControlTextAccent;
  hasRightElement?: boolean;
  variant?: FormFieldInputVariant;
  title?: string;
  children: ReactNode;
};

export const SelectControlContainer = ({
  disabled,
  hasIcon,
  selectSizeVariant,
  textAccent,
  hasRightElement,
  variant,
  title,
  children,
}: SelectControlContainerProps) => (
  <div
    title={title}
    {...stylex.props(
      styles.container,
      selectSizeVariant === 'small' && styles.sizeSmall,
      hasIcon && styles.withIcon,
      textAccent === 'placeholder' && styles.placeholderText,
      disabled === true && styles.disabled,
      hasRightElement === true && styles.withRightElement,
      variant === 'transparent' && styles.transparent,
    )}
  >
    {children}
  </div>
);

export const SelectControlChevron = ({ disabled }: { disabled?: boolean }) => {
  const theme = useTheme();

  return (
    <div
      {...stylex.props(
        styles.chevron,
        disabled === true && styles.chevronDisabled,
      )}
    >
      <IconChevronDown size={theme.icon.size.md} />
    </div>
  );
};

export type SelectControlProps = {
  renderAsTag?: boolean;
  selectedOption: SelectOption<string | number | boolean | null>;
  LeftComponent?: ReactNode;
  isDisabled?: boolean;
  selectSizeVariant?: SelectSizeVariant;
  textAccent?: SelectControlTextAccent;
  hasRightElement?: boolean;
  variant?: FormFieldInputVariant;
};

export const SelectControl = ({
  selectedOption,
  renderAsTag = false,
  LeftComponent,
  isDisabled,
  selectSizeVariant,
  textAccent = 'default',
  hasRightElement,
  variant = 'default',
}: SelectControlProps) => {
  const theme = useTheme();
  const hasLeadingContent =
    isDefined(LeftComponent) ||
    isDefined(selectedOption.Icon) ||
    isDefined(selectedOption.LeftComponent);
  return (
    <SelectControlContainer
      disabled={isDisabled}
      hasIcon={hasLeadingContent}
      selectSizeVariant={selectSizeVariant}
      textAccent={textAccent}
      hasRightElement={hasRightElement}
      variant={variant}
      title={selectedOption.fullLabel}
    >
      {isDefined(LeftComponent) ? (
        LeftComponent
      ) : hasLeadingContent ? (
        <div {...stylex.props(styles.leadingContent)}>
          {isDefined(selectedOption?.Icon) ? (
            isDefined(selectedOption.iconThemeColor) ? (
              <TintedIconTile
                icon={
                  <selectedOption.Icon
                    size={theme.icon.size.md}
                    stroke={theme.icon.stroke.sm}
                  />
                }
                color={selectedOption.iconThemeColor}
                style={{
                  width: theme.icon.size.md,
                  height: theme.icon.size.md,
                }}
              />
            ) : (
              <selectedOption.Icon
                color={
                  isDisabled ? theme.font.color.light : theme.font.color.primary
                }
                size={theme.icon.size.md}
                stroke={theme.icon.stroke.sm}
              />
            )
          ) : null}
          {selectedOption.LeftComponent}
        </div>
      ) : null}
      {renderAsTag && isDefined(selectedOption.color) ? (
        <div {...stylex.props(styles.tagContainer)}>
          <Tag
            color={selectedOption.color}
            className={stylex.props(styles.tag).className}
          >
            {selectedOption.label}
          </Tag>
        </div>
      ) : (
        <OverflowingTextWithTooltip
          text={
            selectedOption.contextualText
              ? `${selectedOption.label} · ${selectedOption.contextualText}`
              : selectedOption.label
          }
        />
      )}
      <SelectControlChevron disabled={isDisabled} />
    </SelectControlContainer>
  );
};

const styles = stylex.create({
  container: {
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    gap: spacing['--t-spacing-1'],
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    cursor: 'pointer',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    textAlign: 'left',
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderTopWidth: 1,
    height: spacing['--t-spacing-8'],
    maxWidth: '100%',
  },
  sizeSmall: {
    height: spacing['--t-spacing-6'],
  },
  withIcon: {
    gridTemplateColumns: 'auto 1fr auto',
  },
  placeholderText: {
    color: fontColor['--t-font-color-tertiary'],
  },
  disabled: {
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'not-allowed',
  },
  withRightElement: {
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
    borderTopRightRadius: 0,
  },
  transparent: {
    borderStyle: 'none',
    paddingInline: 0,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
    height: spacing['--t-spacing-6'],
  },
  chevron: {
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
  },
  chevronDisabled: {
    color: fontColor['--t-font-color-extra-light'],
  },
  leadingContent: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
  },
  tagContainer: {
    overflow: 'hidden',
    minWidth: '0',
  },
  tag: {
    boxSizing: 'border-box',
    maxWidth: '100%',
  },
});
