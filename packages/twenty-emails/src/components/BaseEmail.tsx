import { type JSX } from 'react';
import { I18nProvider } from '@lingui/react';
import { Container, Html, Tailwind } from 'react-email';

import { BaseHead } from 'src/components/BaseHead';
import { Footer } from 'src/components/Footer';
import { Logo } from 'src/components/Logo';
import { EMAIL_TAILWIND_CONFIG } from 'src/tailwind.config';
import { createI18nInstance } from 'src/utils/i18n.utils';
import { type APP_LOCALES } from 'twenty-shared/translations';

type BaseEmailProps = {
  children: JSX.Element | JSX.Element[] | string;
  width?: number;
  locale: keyof typeof APP_LOCALES;
};

export const BaseEmail = ({ children, width, locale }: BaseEmailProps) => {
  const i18nInstance = createI18nInstance(locale);

  return (
    <I18nProvider i18n={i18nInstance}>
      <Html lang={locale}>
        <Tailwind config={EMAIL_TAILWIND_CONFIG}>
          <BaseHead />
          <Container width={width || 290}>
            <Logo />
            {children}
            <Footer i18n={i18nInstance} />
          </Container>
        </Tailwind>
      </Html>
    </I18nProvider>
  );
};
