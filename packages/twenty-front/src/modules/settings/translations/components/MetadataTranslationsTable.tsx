import { StyledSettingsDataModelTableBodyContainer } from '@/settings/data-model/components/SettingsDataModelTableBodyContainer';
import { MetadataTranslationsTableRow } from '@/settings/translations/components/MetadataTranslationsTableRow';
import { type MetadataTranslationLanguageRow } from '@/settings/translations/types/MetadataTranslationLanguageRow';
import { type MetadataTranslationRowValue } from '@/settings/translations/types/MetadataTranslationRowValue';
import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { LEGACY_SKELETON_COLORS } from '@/ui/feedback/skeleton/constants/LEGACY_SKELETON_COLORS';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyArray } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const LANGUAGE_AND_RESET_COLUMNS_WIDTH = 184;
const TRANSLATION_COLUMN_MOBILE_MIN_WIDTH = 150;

const styles = stylex.create({
  scrollWrapper: {
    WebkitOverflowScrolling: { default: null, [media.mobile]: 'touch' },
    overflowX: { default: null, [media.mobile]: 'auto' },
  },
  scrollableContent: (mobileMinWidth: number) => ({
    minWidth: { default: null, [media.mobile]: `${mobileMinWidth}px` },
  }),
});

type MetadataTranslationsTableProps = {
  columns: { property: string; label: string }[];
  languageRows: MetadataTranslationLanguageRow[];
  loading: boolean;
  onSaveTranslationRows: (
    rowValues: MetadataTranslationRowValue[],
  ) => Promise<void>;
};

export const MetadataTranslationsTable = ({
  columns,
  languageRows,
  loading,
  onSaveTranslationRows,
}: MetadataTranslationsTableProps) => {
  const { t } = useLingui();
  const gridTemplateColumns = `160px repeat(${columns.length}, minmax(0, 1fr)) 24px`;

  const showSkeleton = loading && !isNonEmptyArray(columns);

  return (
    <div {...stylex.props(styles.scrollWrapper)}>
      <div
        {...stylex.props(
          styles.scrollableContent(
            LANGUAGE_AND_RESET_COLUMNS_WIDTH +
              columns.length * TRANSLATION_COLUMN_MOBILE_MIN_WIDTH,
          ),
        )}
      >
        <Table>
          <TableRow gridTemplateColumns={gridTemplateColumns}>
            <TableHeader>{t`Language`}</TableHeader>
            {columns.map(({ property, label }) => (
              <TableHeader key={property}>{label}</TableHeader>
            ))}
            <TableHeader />
          </TableRow>
          <StyledSettingsDataModelTableBodyContainer>
            <TableBody>
              {showSkeleton
                ? Array.from({ length: 3 }).map((_, index) => (
                    <SkeletonLine
                      baseColor={LEGACY_SKELETON_COLORS.base}
                      highlightColor={LEGACY_SKELETON_COLORS.highlight}
                      height={32}
                      borderRadius={4}
                      key={index}
                    />
                  ))
                : languageRows.map(({ locale, label, translations }) => (
                    <MetadataTranslationsTableRow
                      key={locale}
                      gridTemplateColumns={gridTemplateColumns}
                      localeLabel={label}
                      translations={translations}
                      onSaveTranslationRows={onSaveTranslationRows}
                    />
                  ))}
              {!showSkeleton && !isNonEmptyArray(languageRows) && (
                <TableCell color={themeCssVariables.font.color.tertiary}>
                  {t`No languages found`}
                </TableCell>
              )}
            </TableBody>
          </StyledSettingsDataModelTableBodyContainer>
        </Table>
      </div>
    </div>
  );
};
