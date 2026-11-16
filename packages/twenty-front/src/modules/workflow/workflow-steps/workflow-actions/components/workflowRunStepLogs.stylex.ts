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
    borderColor: borderColor['--t-border-color-light'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
    padding: spacing['--t-spacing-3'],
  },
  summaryHeader: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'space-between',
  },
  headerLeft: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    minWidth: 0,
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  badgeGroup: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
  statusBadge: {
    alignItems: 'center',
    borderRadius: borderRadius['--t-border-radius-xs'],
    display: 'inline-flex',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    gap: spacing['--t-spacing-1'],
    paddingBlock: spacing['--t-spacing-0_5'],
    paddingInline: spacing['--t-spacing-1'],
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
    alignItems: 'stretch',
    display: 'grid',
    gap: spacing['--t-spacing-2'],
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  },
  metric: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
  },
  metricLabel: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-xs'],
    gap: spacing['--t-spacing-1'],
    textTransform: 'uppercase',
  },
  metricValue: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-lg'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
  sectionTitle: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    margin: 0,
    textTransform: 'uppercase',
  },
  errorCard: {
    background: backgroundTransparent['--t-background-transparent-danger'],
    borderColor: color['--t-color-red'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    padding: spacing['--t-spacing-3'],
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
