import { isNonEmptyString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { useId } from 'react';
import { type SearchInputProps } from './types/SearchInputProps';

import { IconFilter, IconSearch } from '@ui/icon';
import { Button } from '@ui/primitives/input/Button/Button';
import { Input } from '@ui/primitives/input/Input/Input';
import { InputGroup } from '@ui/primitives/input/InputGroup/InputGroup';
import { useTheme } from '@ui/theme';

import { fontColor, spacing } from '../../../theme/tokens.stylex';
import { searchInputMarker } from './SearchInput.stylex';

export const SearchInput = ({
  placeholder,
  filterDropdown,
  size = 'md',
  id,
  filterButtonAriaLabel = 'Filter',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: SearchInputProps) => {
  const theme = useTheme();
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const filterButton = (
    <Button
      variant="outline"
      size={size}
      aria-label={filterButtonAriaLabel}
      startIcon={<IconFilter size={theme.icon.size.md} />}
      xstyle={size === 'sm' ? styles.filterButtonSm : styles.filterButtonMd}
    />
  );

  return (
    <div {...stylex.props(styles.wrapper)}>
      <InputGroup
        className={stylex.props(searchInputMarker).className}
        xstyle={styles.inputGroup}
        size={size}
        startElement={
          <IconSearch
            {...stylex.props(styles.searchIcon)}
            size={theme.icon.size.md}
            aria-hidden
          />
        }
      >
        <Input
          {...props}
          id={inputId}
          placeholder={placeholder}
          aria-label={
            isNonEmptyString(ariaLabelledby)
              ? undefined
              : (ariaLabel ?? placeholder)
          }
          aria-labelledby={ariaLabelledby}
        />
      </InputGroup>
      {filterDropdown?.(filterButton)}
    </div>
  );
};

const styles = stylex.create({
  wrapper: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    inlineSize: '100%',
  },
  filterButtonSm: {
    inlineSize: spacing['--t-spacing-6'],
    maxInlineSize: 'none',
    paddingInline: 0,
  },
  filterButtonMd: {
    inlineSize: spacing['--t-spacing-8'],
    maxInlineSize: 'none',
    paddingInline: 0,
  },
  inputGroup: { boxSizing: 'border-box', flex: 1, minInlineSize: 0 },
  searchIcon: {
    color: {
      default: fontColor['--t-font-color-light'],
      [stylex.when.ancestor(':focus-within', searchInputMarker)]:
        fontColor['--t-font-color-secondary'],
    },
  },
});
