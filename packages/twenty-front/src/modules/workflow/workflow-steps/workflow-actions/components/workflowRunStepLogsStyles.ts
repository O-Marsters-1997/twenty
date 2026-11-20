import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  color,
} from 'twenty-ui/theme/tokens.stylex';

import { monospaceFont } from '@/ui/theme/constants/MonospaceFontFamily.stylex';

export const logStyles = stylex.create({
  summaryCard: {
    background: backgroundTransparent['--t-background-transparent-lighter'],
    padding: spacing['--t-spacing-3'],
    borderColor: borderColor['--t-border-color-light'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-3'],
    display: 'flex',
    flexDirection: 'column',
  },
  summaryHeader: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    minWidth: 0,
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  badgeGroup: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
  },
  statusBadge: {
    borderRadius: borderRadius['--t-border-radius-xs'],
    gap: spacing['--t-spacing-1'],
    paddingBlock: spacing['--t-spacing-0_5'],
    paddingInline: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'inline-flex',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  statusBadgeSuccess: {
    background: backgroundTransparent['--t-background-transparent-success'],
    color: color['--t-color-green'],
  },
  statusBadgeDanger: {
    background: backgroundTransparent['--t-background-transparent-danger'],
    color: color['--t-color-red'],
  },
  metricsRow: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'stretch',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  },
  metric: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
  },
  metricLabel: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-xs'],
    textTransform: 'uppercase',
  },
  metricValue: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-lg'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  section: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
  },
  sectionTitle: {
    margin: 0,
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    textTransform: 'uppercase',
  },
  errorCard: {
    background: backgroundTransparent['--t-background-transparent-danger'],
    padding: spacing['--t-spacing-3'],
    borderColor: color['--t-color-red'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
  },
  errorMessageText: {
    color: fontColor['--t-font-color-primary'],
    fontFamily: monospaceFont.family,
    fontSize: fontSize['--t-font-size-sm'],
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  emptyHint: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-sm'],
    fontStyle: 'italic',
  },
  bodyMeta: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-xs'],
  },
});
