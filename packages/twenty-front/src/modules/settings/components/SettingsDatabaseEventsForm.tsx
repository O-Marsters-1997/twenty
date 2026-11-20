import { WebhookEntitySelect } from '@/settings/developers/components/WebhookEntitySelect';
import { Select } from '@/ui/input/components/Select';
import { useIsMobile } from 'twenty-ui/utilities';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconBox, IconNorthStar, IconPlus, IconTrash } from 'twenty-ui/icon';
import { type SelectOption } from 'twenty-ui/primitives/input';
import { IconButton } from 'twenty-ui/components/input';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const OBJECT_DROPDOWN_WIDTH = 240;
const ACTION_DROPDOWN_WIDTH = 240;
const OBJECT_MOBILE_WIDTH = 150;
const ACTION_MOBILE_WIDTH = 140;

const styles = stylex.create({
  filterRow: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'grid',
    marginBottom: spacing['--t-spacing-2'],
  },
  filterRowDesktop: {
    gridTemplateColumns: `minmax(${OBJECT_DROPDOWN_WIDTH}px, 1fr) ${ACTION_DROPDOWN_WIDTH}px ${spacing['--t-spacing-8']}`,
  },
  filterRowMobile: {
    gridTemplateColumns: `minmax(${OBJECT_MOBILE_WIDTH}px, 1fr) ${ACTION_MOBILE_WIDTH}px ${spacing['--t-spacing-8']}`,
  },
  placeholder: {
    height: spacing['--t-spacing-8'],
    width: spacing['--t-spacing-8'],
  },
});

export const SettingsDatabaseEventsForm = ({
  events,
  updateOperation,
  removeOperation,
  disabled = false,
}: {
  events: { object: string | null; action: string; updatedFields?: string[] }[];
  updateOperation?: (
    index: number,
    field: 'object' | 'action',
    value: string | null,
  ) => void;
  removeOperation?: (index: number) => void;
  disabled?: boolean;
}) => {
  const isMobile = useIsMobile();

  const getActionOptions = (
    updatedFields?: string[],
  ): SelectOption<string>[] => {
    const hasSpecificFields =
      isDefined(updatedFields) && updatedFields.length > 0;

    return [
      { label: t`All`, value: '*', Icon: IconNorthStar },
      { label: t`Created`, value: 'created', Icon: IconPlus },
      {
        label: hasSpecificFields ? t`Updated (on specific fields)` : t`Updated`,
        value: 'updated',
        Icon: IconBox,
      },
      { label: t`Deleted`, value: 'deleted', Icon: IconTrash },
    ];
  };

  return (
    <>
      {events.map((operation, index) => (
        <div
          key={index}
          {...stylex.props(
            styles.filterRow,
            isMobile ? styles.filterRowMobile : styles.filterRowDesktop,
          )}
        >
          <WebhookEntitySelect
            dropdownId={`object-webhook-type-select-${index}`}
            value={operation.object}
            onChange={(newValue) =>
              updateOperation?.(index, 'object', newValue)
            }
            disabled={disabled}
          />
          <Select
            dropdownId={`operation-webhook-type-select-${index}`}
            value={operation.action}
            options={getActionOptions(operation.updatedFields)}
            onChange={(newValue) =>
              updateOperation?.(index, 'action', newValue)
            }
            fullWidth
            disabled={disabled}
          />
          {isDefined(operation.object) && !disabled ? (
            <IconButton
              variant="ghost"
              size="md"
              aria-label={t`Remove filter`}
              onClick={() => removeOperation?.(index)}
            >
              <IconTrash />
            </IconButton>
          ) : (
            <div {...stylex.props(styles.placeholder)} />
          )}
        </div>
      ))}
    </>
  );
};
