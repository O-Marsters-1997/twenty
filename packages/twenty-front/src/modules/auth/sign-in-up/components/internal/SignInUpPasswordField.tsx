import { Text } from 'twenty-ui/primitives/typography';
import { type Form } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import { SignInUpMode } from '@/auth/types/SignInUpMode';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { useLingui } from '@lingui/react/macro';
import { motion } from 'framer-motion';
import { Controller, useFormContext } from 'react-hook-form';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  passwordHint: {
    overflow: 'hidden',
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: 0,
    color: fontColor['--t-font-color-secondary'],
    cursor: 'initial',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    whiteSpace: 'nowrap',
  },
  fullWidthMotionDiv: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: spacing['--t-spacing-3'],
  },
});

export const SignInUpPasswordField = ({
  showErrors,
  signInUpMode,
}: {
  showErrors: boolean;
  signInUpMode: SignInUpMode;
}) => {
  const { t } = useLingui();
  const form = useFormContext<Form>();

  return (
    <motion.div
      {...stylex.props(styles.fullWidthMotionDiv)}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{
        type: 'spring',
        stiffness: 800,
        damping: 35,
      }}
    >
      <Controller
        name="password"
        control={form.control}
        render={({
          field: { onChange, onBlur, value },
          fieldState: { error },
        }) => (
          <div {...stylex.props(styles.inputContainer)}>
            <SettingsTextInput
              instanceId="sign-in-up-password"
              autoFocus
              value={value}
              type="password"
              placeholder={t`Password`}
              onBlur={onBlur}
              onChange={onChange}
              error={showErrors ? error?.message : undefined}
              fullWidth
            />
            {signInUpMode === SignInUpMode.SignUp && (
              <Text {...stylex.props(styles.passwordHint)}>
                {t`At least 8 characters long.`}
              </Text>
            )}
          </div>
        )}
      />
    </motion.div>
  );
};
