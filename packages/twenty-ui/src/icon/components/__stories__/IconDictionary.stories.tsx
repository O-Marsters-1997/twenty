import * as stylex from '@stylexjs/stylex';
import { Section } from '@ui/components/layout/Section/Section';
import { type Meta, type StoryObj } from '@storybook/react-vite';

import * as publicIconExports from '@ui/icon';
import {
  TWENTY_ICON_DICTIONARY,
  TWENTY_ICON_DICTIONARY_CATEGORIES,
} from '@ui/icon/constants/TwentyIconDictionary';
import { type IconComponent } from '@ui/icon/types/IconComponent';
import { ComponentDecorator } from '@ui/testing/decorators/ComponentDecorator';

import { Text } from '@ui/primitives/typography/Text/Text';

import {
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  font,
  fontColor,
  fontWeight,
  spacing,
} from '../../../theme/tokens.stylex';

const getIconComponent = (iconName: string) =>
  publicIconExports[
    iconName as keyof typeof publicIconExports
  ] as IconComponent;

const IconDictionary = () => (
  <div {...stylex.props(styles.dictionary)}>
    {TWENTY_ICON_DICTIONARY_CATEGORIES.map((category, categoryIndex) => (
      <section {...stylex.props(styles.category)} key={category.key}>
        <Section.Header xstyle={styles.categoryTitle} title={category.label} />
        {TWENTY_ICON_DICTIONARY.filter(
          (entry) => entry.category === category.key,
        ).map((entry, entryIndex, entries) => {
          const Icon = getIconComponent(entry.iconName);
          const isLastItem =
            categoryIndex === TWENTY_ICON_DICTIONARY_CATEGORIES.length - 1 &&
            entryIndex === entries.length - 1;

          return (
            <div
              {...stylex.props(styles.item, isLastItem && styles.lastItem)}
              key={entry.key}
            >
              <Text>{entry.label}</Text>
              <Icon
                aria-hidden
                color="var(--t-font-color-light)"
                size={14}
                stroke={1.6}
              />
            </div>
          );
        })}
      </section>
    ))}
  </div>
);

const styles = stylex.create({
  dictionary: {
    backgroundColor: background['--t-background-secondary'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    fontFamily: font['--t-font-family'],
    overflow: 'hidden',
    width: 400,
  },
  category: {
    margin: 0,
  },
  categoryTitle: {
    alignItems: 'stretch',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    boxSizing: 'border-box',
    display: 'flex',
    height: 24,
    justifyContent: 'center',
    margin: 0,
    padding: spacing['--t-spacing-2'],
  },
  item: {
    alignItems: 'center',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    boxSizing: 'border-box',
    display: 'flex',
    fontSize: 13,
    fontWeight: fontWeight['--t-font-weight-medium'],
    height: 30,
    justifyContent: 'space-between',
    lineHeight: 1.4,
    padding: spacing['--t-spacing-2'],
  },
  lastItem: {
    borderBottomWidth: 0,
  },
});

const meta: Meta<typeof IconDictionary> = {
  title: 'UI/Icon/Icon Dictionary',
  component: IconDictionary,
  decorators: [ComponentDecorator],
  parameters: {
    container: { width: 432 },
  },
};

export default meta;

type Story = StoryObj<typeof IconDictionary>;

export const CanonicalMappings: Story = {};
