import { type ComponentType } from 'react';

import { SettingsListSkeletonCard } from '@/settings/components/SettingsListSkeletonCard';

import { type IconComponent, IconPlus } from 'twenty-ui/icon';
import { Card } from 'twenty-ui/primitives/surfaces';
import { useTheme } from 'twenty-ui/theme';
import { SettingsListItemCardContent } from './SettingsListItemCardContent';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  backgroundTransparent,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  footer: {
    alignItems: 'center',
    display: 'flex',
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-1'],
  },
  button: {
    background: {
      default: background['--t-background-primary'],
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderStyle: 'none',
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    cursor: 'pointer',
    display: 'flex',
    flexBasis: '0',
    flexGrow: '1',
    flexShrink: '0',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    height: spacing['--t-spacing-8'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: '0',
    width: '100%',
  },
});

type SettingsListCardProps<ListItem extends { id: string }> = {
  items: ListItem[];
  getItemLabel: (item: ListItem) => string;
  getItemDescription?: (item: ListItem) => string;
  hasFooter?: boolean;
  isLoading?: boolean;
  onRowClick?: (item: ListItem) => void;
  RowIcon?: IconComponent;
  RowIconFn?: (item: ListItem) => IconComponent | undefined;
  RowIconColor?: string;
  RowRightComponent: ComponentType<{ item: ListItem }>;
  footerButtonLabel?: string;
  onFooterButtonClick?: () => void;
  to?: (item: ListItem) => string;
  rounded?: boolean;
};

export const SettingsListCard = <
  ListItem extends { id: string } = {
    id: string;
  },
>({
  items,
  getItemLabel,
  getItemDescription,
  hasFooter,
  isLoading,
  onRowClick,
  RowIcon,
  RowIconFn,
  RowIconColor,
  RowRightComponent,
  onFooterButtonClick,
  footerButtonLabel,
  to,
  rounded,
}: SettingsListCardProps<ListItem>) => {
  const theme = useTheme();

  if (isLoading === true) return <SettingsListSkeletonCard />;

  return (
    <Card.Root rounded={rounded}>
      {items.map((item, index) => (
        <SettingsListItemCardContent
          key={item.id}
          LeftIcon={RowIconFn ? RowIconFn(item) : RowIcon}
          LeftIconColor={RowIconColor}
          label={getItemLabel(item)}
          description={getItemDescription?.(item)}
          rightComponent={<RowRightComponent item={item} />}
          divider={index < items.length - 1}
          onClick={onRowClick ? () => onRowClick?.(item) : undefined}
          to={to?.(item)}
        />
      ))}
      {hasFooter && (
        <Card.Footer divider={!!items.length} {...stylex.props(styles.footer)}>
          <button
            onClick={onFooterButtonClick}
            {...stylex.props(styles.button)}
          >
            <IconPlus size={theme.icon.size.md} />
            {footerButtonLabel}
          </button>
        </Card.Footer>
      )}
    </Card.Root>
  );
};
