import { useIsSettingsPage } from '@/navigation/hooks/useIsSettingsPage';
import { type BreadcrumbProps } from '@/ui/navigation/bread-crumb/types/BreadcrumbProps';
import { getBreadcrumbItems } from '@/ui/navigation/bread-crumb/utils/getBreadcrumbItems';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Link } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { IconChevronLeft } from 'twenty-ui/icon';
import { Breadcrumb as BreadcrumbPrimitive } from 'twenty-ui/primitives/navigation';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  color,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type MobileBreadcrumbProps = BreadcrumbProps;

const styles = stylex.create({
  wrapper: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    columnGap: spacing['--t-spacing-1'],
    display: 'grid',
    fontSize: fontSize['--t-font-size-md'],
    gridAutoFlow: 'column',
    height: spacing['--t-spacing-8'],
    maxWidth: '100%',
    minWidth: 0,
  },
  linkContainer: {
    minWidth: 0,
  },
  link: {
    color: 'inherit',
    display: 'block',
    outlineColor: {
      default: null,
      ':focus-visible': color['--t-color-blue'],
    },
    outlineOffset: {
      default: null,
      ':focus-visible': '-2px',
    },
    outlineStyle: {
      default: null,
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      default: null,
      ':focus-visible': '2px',
    },
    overflow: 'hidden',
    textDecoration: 'none',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  text: {
    color: 'inherit',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

export const MobileBreadcrumb = ({
  className,
  links,
}: MobileBreadcrumbProps) => {
  const theme = useTheme();
  const isSettingsPage = useIsSettingsPage();

  if (isSettingsPage && links.length <= 2) {
    return null;
  }

  const previousLink = links.at(-2);

  if (!isDefined(previousLink)) {
    return (
      <BreadcrumbPrimitive
        aria-label={t`Breadcrumb`}
        className={className}
        links={getBreadcrumbItems(links)}
      />
    );
  }

  const text = previousLink.children;
  const title = isNonEmptyString(text) ? text : undefined;
  const wrapperProps = stylex.props(styles.wrapper);

  return (
    <nav
      aria-label={t`Breadcrumb`}
      {...wrapperProps}
      className={[wrapperProps.className, className].join(' ')}
    >
      {isNonEmptyString(previousLink.href) ? (
        <>
          <IconChevronLeft size={theme.icon.size.md} aria-hidden />
          <div {...stylex.props(styles.linkContainer)}>
            <Link
              title={title}
              to={previousLink.href}
              {...stylex.props(styles.link)}
            >
              <Trans>Back to {text}</Trans>
            </Link>
          </div>
        </>
      ) : (
        <span title={title} {...stylex.props(styles.text)}>
          {text}
        </span>
      )}
    </nav>
  );
};
