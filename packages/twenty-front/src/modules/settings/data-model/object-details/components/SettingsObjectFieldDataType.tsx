import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { Link } from 'react-router-dom';

import { type SettingsFieldType } from '@/settings/data-model/types/SettingsFieldType';
import { getSettingsFieldTypeConfig } from '@/settings/data-model/utils/getSettingsFieldTypeConfig';
import { type IconComponent, IconTwentyStar } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsObjectFieldDataTypeProps = {
  to?: string;
  Icon?: IconComponent;
  label?: string;
  labelDetail?: string;
  value: SettingsFieldType;
  onClick?: (event: React.MouseEvent) => void;
};

export const SettingsObjectFieldDataType = ({
  to,
  value,
  Icon: IconFromProps,
  label: labelFromProps,
  labelDetail,
  onClick,
}: SettingsObjectFieldDataTypeProps) => {
  const theme = useTheme();
  const { i18n } = useLingui();
  const fieldTypeConfig = getSettingsFieldTypeConfig(value);
  const Icon: IconComponent =
    IconFromProps ?? fieldTypeConfig?.Icon ?? IconTwentyStar;
  const label =
    labelFromProps ??
    (isDefined(fieldTypeConfig) ? i18n._(fieldTypeConfig.label) : undefined);

  const content = (
    <>
      <div {...stylex.props(styles.iconWrapper)}>
        <Icon size={theme.icon.size.sm} />
      </div>
      <div {...stylex.props(styles.labelContainer)}>
        {label}{' '}
        <span {...stylex.props(styles.span)}>
          {labelDetail && `· ${labelDetail}`}
        </span>
      </div>
    </>
  );

  return to ? (
    <Link
      {...stylex.props(styles.dataType, styles.dataTypeLink)}
      to={to}
      onClick={onClick}
    >
      {content}
    </Link>
  ) : (
    <div {...stylex.props(styles.dataType)} onClick={onClick}>
      {content}
    </div>
  );
};

const styles = stylex.create({
  dataType: {
    borderColor: 'transparent',
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: 1,
    gap: spacing['--t-spacing-2'],
    overflow: 'hidden',
    textDecoration: 'none',
    alignItems: 'center',
    color: {
      default: fontColor['--t-font-color-primary'],
      ':hover': fontColor['--t-font-color-primary'],
    },
    cursor: 'default',
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    userSelect: 'none',
    height: 20,
  },
  dataTypeLink: {
    textDecoration: 'underline',
    color: {
      default: fontColor['--t-font-color-secondary'],
      ':hover': fontColor['--t-font-color-primary'],
    },
    cursor: 'pointer',
  },
  labelContainer: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  iconWrapper: {
    flexGrow: '1',
    flexShrink: '0',
    flexBasis: 'auto',
    display: 'flex',
  },
  span: {
    color: fontColor['--t-font-color-extra-light'],
  },
});
