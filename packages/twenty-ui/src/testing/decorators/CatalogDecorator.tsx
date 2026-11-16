import { isNumber, isString } from '@sniptt/guards';
import { type Decorator } from '@storybook/react-vite';
import * as stylex from '@stylexjs/stylex';
import { type ComponentProps, type JSX } from 'react';

import { mergeStylexProps } from '../../utilities/internal/mergeStylexProps';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from '../../theme/tokens.stylex';

const emptyDimension = {
  name: '',
  values: [undefined],
  props: () => ({}),
} as CatalogDimension;

const isStringOrNumber = (term: unknown): term is string | number =>
  isString(term) || isNumber(term);

export type CatalogDimension<
  ComponentType extends React.ElementType = () => JSX.Element,
> = {
  name: string;
  values: any[];
  props: (value: any) => Partial<ComponentProps<ComponentType>>;
  labels?: (value: any) => string;
};

export type CatalogOptions = {
  elementContainer?: {
    width?: number;
    style?: React.CSSProperties;
    className?: string;
  };
};

export const CatalogDecorator: Decorator = (Story, context) => {
  const {
    catalog: { dimensions = [], options = {} } = {
      dimensions: [],
      options: {},
    },
  } = context.parameters || {};

  if (!dimensions || !Array.isArray(dimensions)) {
    return <Story />;
  }

  const [
    dimension1 = emptyDimension,
    dimension2 = emptyDimension,
    dimension3 = emptyDimension,
    dimension4 = emptyDimension,
  ] = dimensions as CatalogDimension[];

  return (
    <div {...stylex.props(styles.container)}>
      {dimension4.values.map((value4: any, index4: number) => (
        <div {...stylex.props(styles.columnContainer)} key={`d4-${index4}`}>
          <div {...stylex.props(styles.columnTitle)}>
            {dimension4.labels?.(value4) ??
              (isStringOrNumber(value4) ? value4 : '')}
          </div>
          {dimension3.values.map((value3: any, index3: number) => (
            <div {...stylex.props(styles.rowsContainer)} key={`d3-${index3}`}>
              <div {...stylex.props(styles.rowsTitle)}>
                {dimension3.labels?.(value3) ??
                  (isStringOrNumber(value3) ? value3 : '')}
              </div>
              {dimension2.values.map((value2: any, index2: number) => (
                <div
                  {...stylex.props(styles.rowContainer)}
                  key={`d2-${index2}`}
                >
                  <div {...stylex.props(styles.rowTitle)}>
                    {dimension2.labels?.(value2) ??
                      (isStringOrNumber(value2) ? value2 : '')}
                  </div>
                  {dimension1.values.map((value1: any, index1: number) => {
                    return (
                      <div
                        {...stylex.props(styles.cellContainer)}
                        key={`d1-${index1}`}
                        id={
                          dimensions.length > 1
                            ? `catalog-cell-${index4}-${index3}-${index2}-${index1}`
                            : value1
                        }
                      >
                        <span {...stylex.props(styles.elementTitle)}>
                          {dimension1.labels?.(value1) ??
                            (isStringOrNumber(value1) ? value1 : '')}
                        </span>
                        <div
                          {...mergeStylexProps(
                            stylex.props(styles.elementContainer),
                            options?.elementContainer?.className,
                          )}
                          style={{
                            minWidth: options?.elementContainer?.width
                              ? `${options.elementContainer.width}px`
                              : 'auto',
                            ...options?.elementContainer?.style,
                          }}
                        >
                          <Story
                            args={{
                              ...context.args,
                              ...dimension1.props(value1),
                              ...dimension2.props(value2),
                              ...dimension3.props(value3),
                              ...dimension4.props(value4),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const styles = stylex.create({
  columnTitle: {
    fontSize: fontSize['--t-font-size-lg'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    margin: spacing['--t-spacing-2'],
  },
  rowsTitle: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    margin: spacing['--t-spacing-2'],
    width: 100,
  },
  rowTitle: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    margin: spacing['--t-spacing-2'],
    width: 100,
  },
  elementTitle: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    marginBottom: spacing['--t-spacing-1'],
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
  },
  columnContainer: {
    display: 'flex',
    flexDirection: 'column',
    padding: spacing['--t-spacing-2'],
  },
  rowsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
  rowContainer: {
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'row',
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing['--t-spacing-2'],
  },
  elementContainer: {
    display: 'flex',
  },
  cellContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    padding: spacing['--t-spacing-2'],
  },
});
