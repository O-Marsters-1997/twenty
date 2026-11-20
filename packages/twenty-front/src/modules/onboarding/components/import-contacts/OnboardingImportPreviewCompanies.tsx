import { IMPORT_CONTACTS_PREVIEW_COMPANIES } from '@/onboarding/constants/ImportContactsPreviewCompanies';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import { useLingui } from '@lingui/react/macro';
import { getLogoUrlFromDomainName } from 'twenty-shared/utils';
import { Avatar, Chip } from 'twenty-ui/primitives/data-display';
import { Checkbox } from 'twenty-ui/primitives/input';
import { IconBuildingSkyscraper, IconPlus } from 'twenty-ui/icon';

import { themeCssVariables, useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  spacing,
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
} from 'twenty-ui/theme/tokens.stylex';

const PREVIEW_ROW_HEIGHT = 32;

const styles = stylex.create({
  column: {
    flex: '1 1 0',
    gap: '1px',
    overflow: 'hidden',
    backgroundColor: borderColor['--t-border-color-light'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minWidth: '0',
  },
  headerTitle: {
    flex: '1 1 0',
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    minWidth: '0',
    paddingLeft: spacing['--t-spacing-2'],
  },
  headerAction: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    height: spacing['--t-spacing-6'],
    width: spacing['--t-spacing-6'],
  },
  row: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: '0',
    height: `${PREVIEW_ROW_HEIGHT}px`,
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
  },
  companyCell: {
    display: 'flex',
    paddingLeft: spacing['--t-spacing-2'],
  },
});

export const OnboardingImportPreviewCompanies = () => {
  const { t } = useLingui();
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.column)}>
      <div {...stylex.props(styles.row)}>
        <Checkbox checked={false} hoverable />
        <div {...stylex.props(styles.headerTitle)}>
          <IconBuildingSkyscraper
            size={theme.icon.size.md}
            color={themeCssVariables.font.color.tertiary}
          />
          {t`Companies`}
        </div>
        <div {...stylex.props(styles.headerAction)}>
          <IconPlus
            size={theme.icon.size.md}
            color={themeCssVariables.font.color.tertiary}
          />
        </div>
      </div>
      {IMPORT_CONTACTS_PREVIEW_COMPANIES.map((company) => (
        <div key={company.id} {...stylex.props(styles.row)}>
          <Checkbox checked={false} hoverable />
          <div {...stylex.props(styles.companyCell)}>
            <Chip
              size="sm"
              variant="soft"
              color="primary"
              startElement={
                <Avatar
                  shape="square"
                  size="sm"
                  name={company.name}
                  colorSeed={company.id}
                  src={getAbsoluteImageUrl(
                    getLogoUrlFromDomainName(company.domainName),
                  )}
                />
              }
            >
              {company.name}
            </Chip>
          </div>
        </div>
      ))}
    </div>
  );
};
