/* oxlint-disable twenty/no-hardcoded-colors */
import { pixelBasedPreset, type TailwindConfig } from 'react-email';

export const EMAIL_TAILWIND_CONFIG: TailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        highlighted: '#333333',
        primary: '#666666',
        tertiary: '#b3b3b3',
        inverted: '#ffffff',
        blue: '#5e90f2',
        highlight: '#f1f1f1',
        outline: '#ebebeb',
        button: '#333333',
        'shade-light': 'rgba(0, 0, 0, 0.04)',
      },
      fontFamily: { base: ['Trebuchet MS'] },
      fontSize: {
        sm: ['12px', 'normal'],
        md: '13px',
        lg: ['16px', 'normal'],
        xl: ['24px', 'normal'],
      },
      lineHeight: { base: '20px' },
      borderRadius: { sm: '4px', md: '8px' },
    },
  },
};
