import { Font, Head } from 'react-email';

export const BaseHead = () => {
  return (
    <Head>
      <title>Twenty email</title>
      <Font
        fontFamily="Trebuchet MS"
        fallbackFontFamily="sans-serif"
        fontStyle="normal"
        fontWeight={400}
      />
    </Head>
  );
};
