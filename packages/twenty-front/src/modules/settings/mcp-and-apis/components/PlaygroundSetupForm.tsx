import { useOpenPlayground } from '@/settings/mcp-and-apis/hooks/useOpenPlayground';
import { SETTINGS_PLAYGROUND_FORM_SCHEMA_SELECT_OPTIONS } from '@/settings/mcp-and-apis/constants/SettingsPlaygroundFormSchemaSelectOptions';
import { PlaygroundSchemas } from '@/settings/mcp-and-apis/types/PlaygroundSchemas';
import { Select } from '@/ui/input/components/Select';
import { styled } from '@linaria/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLingui } from '@lingui/react/macro';
import { Controller, useForm } from 'react-hook-form';
import { Button } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';
import { z } from 'zod';

const playgroundSetupFormSchema = z.object({
  schema: z.enum(PlaygroundSchemas),
});

type PlaygroundSetupFormValues = z.infer<typeof playgroundSetupFormSchema>;

const StyledForm = styled.form`
  align-items: end;
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: 1fr auto;
  width: 100%;
`;

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
    },
  });

  const onSubmit = async (values: PlaygroundSetupFormValues) => {
    await openPlayground(values.schema);
  };

  return (
    <StyledForm onSubmit={handleSubmit(onSubmit)}>
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
      <Button
        type="submit"
        disabled={isSubmitting}
        variant="solid"
        color="accent"
      >{t`Launch`}</Button>
    </StyledForm>
  );
};
