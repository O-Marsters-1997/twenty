import { useOpenPlayground } from '@/settings/mcp-and-apis/hooks/useOpenPlayground';
import { SETTINGS_PLAYGROUND_FORM_SCHEMA_SELECT_OPTIONS } from '@/settings/mcp-and-apis/constants/SettingsPlaygroundFormSchemaSelectOptions';
import { PlaygroundSchemas } from '@/settings/mcp-and-apis/types/PlaygroundSchemas';
import { PlaygroundTypes } from '@/settings/mcp-and-apis/types/PlaygroundTypes';
import { Select } from '@/ui/input/components/Select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLingui } from '@lingui/react/macro';
import { Controller, useForm } from 'react-hook-form';
import { IconApi, IconBrandGraphql } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { z } from 'zod';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const playgroundSetupFormSchema = z.object({
  schema: z.enum(PlaygroundSchemas),
  playgroundType: z.enum(PlaygroundTypes),
});

type PlaygroundSetupFormValues = z.infer<typeof playgroundSetupFormSchema>;

const styles = stylex.create({
  form: {
    alignItems: 'end',
    display: 'grid',
    gap: spacing['--t-spacing-2'],
    gridTemplateColumns: '1fr 1fr auto',
    width: '100%',
  },
});

export const PlaygroundSetupForm = () => {
  const { t } = useLingui();
  const openPlayground = useOpenPlayground();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PlaygroundSetupFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(playgroundSetupFormSchema),
    defaultValues: {
      schema: PlaygroundSchemas.CORE,
      playgroundType: PlaygroundTypes.REST,
    },
  });

  const onSubmit = async (values: PlaygroundSetupFormValues) => {
    await openPlayground(values.playgroundType, values.schema);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} {...stylex.props(styles.form)}>
      <Controller
        name="schema"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Select
            dropdownId="schema"
            label={t`Schema`}
            options={SETTINGS_PLAYGROUND_FORM_SCHEMA_SELECT_OPTIONS.map(
              (option) => ({
                ...option,
                label: t(option.label),
              }),
            )}
            value={value}
            onChange={onChange}
          />
        )}
      />
      <Controller
        name="playgroundType"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Select
            dropdownId="apiPlaygroundType"
            label={t`API`}
            options={[
              { value: PlaygroundTypes.REST, label: t`REST`, Icon: IconApi },
              {
                value: PlaygroundTypes.GRAPHQL,
                label: t`GraphQL`,
                Icon: IconBrandGraphql,
              },
            ]}
            value={value}
            onChange={onChange}
          />
        )}
      />
      <Button
        type="submit"
        disabled={isSubmitting}
        variant="solid"
        color="accent"
      >{t`Launch`}</Button>
    </form>
  );
};
