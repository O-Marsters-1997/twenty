import {
  TitleInput,
  type TitleInputProps,
} from '@/ui/input/components/TitleInput';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  titleInputContainer: {
    maxWidth: '420px',
    minWidth: '0',
    width: 'fit-content',
  },
});

export type SettingsEditableTitleProps = TitleInputProps;

export const SettingsEditableTitle = (props: SettingsEditableTitleProps) => (
  <div {...stylex.props(styles.titleInputContainer)}>
    <TitleInput
      // oxlint-disable-next-line react/jsx-props-no-spreading
      {...props}
      sizeVariant={props.sizeVariant ?? 'sm'}
      textColor={props.textColor ?? themeCssVariables.font.color.primary}
    />
  </div>
);
