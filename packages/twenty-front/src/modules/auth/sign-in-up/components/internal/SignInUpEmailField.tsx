import { type Form } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { useLingui } from '@lingui/react/macro';
import { motion } from 'framer-motion';
import { Controller, useFormContext } from 'react-hook-form';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  fullWidthMotionDiv: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: spacing['--t-spacing-3'],
  },
});

export const SignInUpEmailField = ({
  showErrors,
  onInputChange,
}: {
  showErrors: boolean;
  onInputChange?: (value: string) => void;
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
        name="email"
        control={form.control}
        render={({
          field: { onChange, onBlur, value },
          fieldState: { error },
        }) => (
          <div {...stylex.props(styles.inputContainer)}>
            <SettingsTextInput
              instanceId="sign-in-up-email"
              autoComplete="email"
              autoFocus
              value={value}
              placeholder={t`Email`}
              onBlur={onBlur}
              onChange={(email: string) => {
                if (isDefined(onInputChange)) onInputChange(email);
                onChange(email);
              }}
              error={showErrors ? error?.message : undefined}
              fullWidth
            />
          </div>
        )}
      />
    </motion.div>
  );
};
