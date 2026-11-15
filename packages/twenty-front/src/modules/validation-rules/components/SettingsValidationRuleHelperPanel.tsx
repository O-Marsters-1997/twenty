import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { MenuItem } from 'twenty-ui/components/navigation';
import { useIcons } from 'twenty-ui/icon';

import { SettingsValidationRuleHelperDetails } from '@/validation-rules/components/SettingsValidationRuleHelperDetails';
import { type ValidationRuleEditorField } from '@/validation-rules/types/ValidationRuleEditorField';
import { type ValidationRuleHelperItem } from '@/validation-rules/types/ValidationRuleHelperItem';
import { getValidationRuleHelperItemIcon } from '@/validation-rules/utils/getValidationRuleHelperItemIcon';
import * as stylex from '@stylexjs/stylex';
import { borderColor, fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  panel: {
    display: 'grid',
    fontSize: fontSize['--t-font-size-md'],
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    height: '240px',
    overflow: 'hidden',
  },
  list: {
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: borderColor['--t-border-color-medium'],
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-4'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-4'],
  },
  empty: {
    color: fontColor['--t-font-color-light'],
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
  },
});

const getItemKey = (item: ValidationRuleHelperItem) =>
  item.kind === 'field'
    ? `field:${item.field.path}`
    : `${item.kind}:${item.definition.name}`;

type SettingsValidationRuleHelperPanelProps = {
  items: ValidationRuleHelperItem[];
  highlightedIndex: number;
  isFocused: boolean;
  editorFields: ValidationRuleEditorField[];
  onHighlight: (index: number) => void;
  onSelect: (item: ValidationRuleHelperItem) => void;
};

export const SettingsValidationRuleHelperPanel = ({
  items,
  highlightedIndex,
  isFocused,
  editorFields,
  onHighlight,
  onSelect,
}: SettingsValidationRuleHelperPanelProps) => {
  const { t } = useLingui();
  const { getIcon } = useIcons();

  const highlightedItem = items[highlightedIndex];
  const EnterHintIcon = getIcon('IconArrowBack');

  return (
    <div {...stylex.props(styles.panel)}>
      <div role="listbox" aria-label={t`Suggestions`} {...stylex.props(styles.list)}>
        {items.length === 0 && (
          <div {...stylex.props(styles.empty)}>{t`Nothing to suggest here.`}</div>
        )}
        {items.map((item, index) => {
          const isHighlighted = index === highlightedIndex;
          const isFocusedItem = isFocused && isHighlighted;

          return (
            <div
              key={getItemKey(item)}
              role="option"
              aria-selected={isFocusedItem}
              ref={
                isHighlighted
                  ? (element: HTMLDivElement | null) =>
                      element?.scrollIntoView({ block: 'nearest' })
                  : undefined
              }
              onMouseDown={(event) => event.preventDefault()}
            >
              <MenuItem
                LeftIcon={getValidationRuleHelperItemIcon({ item, getIcon })}
                text={
                  item.kind === 'field'
                    ? item.field.label
                    : item.definition.name
                }
                RightIcon={isFocusedItem ? EnterHintIcon : undefined}
                focused={isFocusedItem}
                onMouseEnter={() => onHighlight(index)}
                onClick={() => onSelect(item)}
              />
            </div>
          );
        })}
      </div>
      {isDefined(highlightedItem) ? (
        <SettingsValidationRuleHelperDetails
          item={highlightedItem}
          editorFields={editorFields}
        />
      ) : (
        <div />
      )}
    </div>
  );
};
