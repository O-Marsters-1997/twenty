import { MetadataTranslationsTable } from '@/settings/translations/components/MetadataTranslationsTable';
import { useMetadataTranslations } from '@/settings/translations/hooks/useMetadataTranslations';
import { buildMetadataTranslationsTable } from '@/settings/translations/utils/buildMetadataTranslationsTable';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { Section } from 'twenty-ui/components/layout';
import { IconSearch } from 'twenty-ui/icon';
import { type MetadataTranslationsInput } from '~/generated-metadata/graphql';
import { useLocaleOptions } from '@/localization/hooks/useLocaleOptions';
import { normalizeSearchText } from 'twenty-ui/utilities';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  searchInputContainer: {
    paddingBottom: spacing['--t-spacing-2'],
  },
});

type SettingsMetadataTranslationsSectionProps = {
  input: MetadataTranslationsInput;
};

export const SettingsMetadataTranslationsSection = ({
  input,
}: SettingsMetadataTranslationsSectionProps) => {
  const { t } = useLingui();
  const [searchTerm, setSearchTerm] = useState('');
  const columnLabelByProperty: Record<string, string> = {
    labelSingular: t`Singular`,
    labelPlural: t`Plural`,
    label: t`Label`,
    description: t`Description`,
  };
  const { metadataTranslations, loading, saveTranslationRows } =
    useMetadataTranslations(input);
  const localeOptions = useLocaleOptions();

  const normalizedSearchTerm = normalizeSearchText(searchTerm);
  const filteredLocaleOptions = localeOptions.filter(
    ({ label, searchKeywords }) =>
      normalizeSearchText(`${label} ${searchKeywords}`).includes(
        normalizedSearchTerm,
      ),
  );

  const { properties, languageRows } = buildMetadataTranslationsTable({
    metadataTranslations,
    localeOptions: filteredLocaleOptions,
  });
  const columns = properties.map((property) => ({
    property,
    label: columnLabelByProperty[property] ?? property,
  }));

  return (
    <Section.Root>
      <Section.Header
        title={t`Languages`}
        description={t`Languages without a translation show the source text.`}
      />
      <div {...stylex.props(styles.searchInputContainer)}>
        <SettingsTextInput
          instanceId="settings-metadata-translations-search"
          LeftIcon={IconSearch}
          placeholder={t`Search a language...`}
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>
      <MetadataTranslationsTable
        columns={columns}
        languageRows={languageRows}
        loading={loading}
        onSaveTranslationRows={saveTranslationRows}
      />
    </Section.Root>
  );
};
