import { useLingui } from '@lingui/react/macro';
import { type Editor } from '@tiptap/core';
import {
  type CanvasTheme,
  isDefined,
  resolveCanvasTheme,
} from 'twenty-shared/utils';

import { useLiveEditorState } from '@/advanced-text-editor/hooks/useLiveEditorState';
import { EmailBlockSettingsFieldInput } from '@/side-panel/pages/email-block-settings/components/EmailBlockSettingsFieldInput';
import {
  EmailBoxSidesInput,
  type CssBoxSides,
} from '@/side-panel/pages/email-block-settings/components/EmailBoxSidesInput';
import { EMAIL_BODY_THEME_FIELDS } from '@/side-panel/pages/email-block-settings/constants/EmailBodyThemeFields';
import { EMAIL_PAGE_THEME_FIELDS } from '@/side-panel/pages/email-block-settings/constants/EmailPageThemeFields';
import { type EmailThemeField } from '@/side-panel/pages/email-block-settings/types/EmailThemeField';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-3'],
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-4'],
  },
  groupTitle: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    marginTop: {
      default: null,
      ':not(:first-child)': spacing['--t-spacing-3'],
    },
  },
  hint: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-4'],
  },
});

const themeBoxValueToSides = (value: string): CssBoxSides => {
  const tokens = value.trim().split(/\s+/);

  if (tokens.length === 4) {
    return {
      top: tokens[0],
      right: tokens[1],
      bottom: tokens[2],
      left: tokens[3],
    };
  }

  if (tokens.length === 3) {
    return {
      top: tokens[0],
      right: tokens[1],
      bottom: tokens[2],
      left: tokens[1],
    };
  }

  if (tokens.length === 2) {
    return {
      top: tokens[0],
      right: tokens[1],
      bottom: tokens[0],
      left: tokens[1],
    };
  }

  return { top: value, right: value, bottom: value, left: value };
};

const sidesToThemeBoxValue = ({ top, right, bottom, left }: CssBoxSides) =>
  top === right && right === bottom && bottom === left
    ? top
    : `${top} ${right} ${bottom} ${left}`;

type EmailPageStyleSectionProps = {
  editor: Editor;
};

export const EmailPageStyleSection = ({
  editor,
}: EmailPageStyleSectionProps) => {
  const { t, i18n } = useLingui();

  const canvasTheme = useLiveEditorState(editor, (currentEditor) =>
    resolveCanvasTheme(currentEditor.state.doc.attrs.canvasTheme),
  );

  if (!isDefined(canvasTheme)) {
    return (
      <div {...stylex.props(styles.hint)}>
        {t`Select a section, columns, button or divider in the email body to edit its settings.`}
      </div>
    );
  }

  const setThemeValue = (themeKey: keyof CanvasTheme, value: string) => {
    editor
      .chain()
      .command(({ tr }) => {
        tr.setDocAttribute('canvasTheme', {
          ...canvasTheme,
          [themeKey]: value,
        });
        return true;
      })
      .run();
  };

  const renderThemeField = (field: EmailThemeField) => {
    if (field.input === 'box') {
      return (
        <EmailBoxSidesInput
          key={field.property}
          label={i18n._(field.label)}
          sides={themeBoxValueToSides(canvasTheme[field.property])}
          onChange={(sides) =>
            setThemeValue(field.property, sidesToThemeBoxValue(sides))
          }
          placeholder={field.placeholder}
        />
      );
    }

    return (
      <EmailBlockSettingsFieldInput
        key={field.property}
        field={field}
        value={canvasTheme[field.property]}
        onChange={(value) => setThemeValue(field.property, value)}
      />
    );
  };

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.groupTitle)}>{t`Page style`}</div>
      {EMAIL_PAGE_THEME_FIELDS.map(renderThemeField)}

      <div {...stylex.props(styles.groupTitle)}>{t`Body`}</div>
      {EMAIL_BODY_THEME_FIELDS.map(renderThemeField)}
    </div>
  );
};
