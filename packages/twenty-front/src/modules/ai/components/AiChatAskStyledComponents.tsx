import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
} from 'twenty-ui/theme/tokens.stylex';

export const aiChatAskStyles = stylex.create({
  card: {
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  statusMessage: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  statusDetail: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
    overflowWrap: 'anywhere',
  },
});
