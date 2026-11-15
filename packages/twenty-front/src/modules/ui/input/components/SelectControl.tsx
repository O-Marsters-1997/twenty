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

// TODO: factorize this with https://github.com/twentyhq/core-team-issues/issues/752
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
    alignItems: 'center',
    backgroundColor: backgroundTransparent['--t-background-transparent-lighter'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomWidth: 1,
    borderColor: borderColor['--t-border-color-medium'],
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderStyle: 'solid',
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderTopWidth: 1,
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    cursor: 'pointer',
    display: 'grid',
    gap: spacing['--t-spacing-1'],
    gridTemplateColumns: '1fr auto',
    height: spacing['--t-spacing-8'],
    maxWidth: '100%',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    textAlign: 'left',
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
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderStyle: 'none',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
    height: spacing['--t-spacing-6'],
    paddingInline: 0,
  },
  chevron: {
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
  },
  chevronDisabled: {
    color: fontColor['--t-font-color-extra-light'],
  },
  leadingContent: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
  tagContainer: {
    minWidth: '0',
    overflow: 'hidden',
  },
  tag: {
    boxSizing: 'border-box',
    maxWidth: '100%',
  },
});
