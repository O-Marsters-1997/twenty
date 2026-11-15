import { useEffect, useState } from 'react';
import { useIMask } from 'react-imask';

import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { DATE_BLOCKS } from '@/ui/input/components/internal/date/constants/DateBlocks';
import { MAX_DATE } from '@/ui/input/components/internal/date/constants/MaxDate';
import { MIN_DATE } from '@/ui/input/components/internal/date/constants/MinDate';
import { useParseDateInputStringToJSDate } from '@/ui/input/components/internal/date/hooks/useParseDateInputStringToJSDate';
import { useParsePlainDateToDateInputString } from '@/ui/input/components/internal/date/hooks/useParsePlainDateToDateInputString';
import { getDateMask } from '@/ui/input/components/internal/date/utils/getDateMask';
import { type FormFieldInputVariant } from '@/ui/input/types/FormFieldInputVariant';

import { useParseDateInputStringToPlainDate } from '@/ui/input/components/internal/date/hooks/useParseDateInputStringToPlainDate';
import { useParseJSDateToIMaskDateInputString } from '@/ui/input/components/internal/date/hooks/useParseJSDateToIMaskDateInputString';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type DatePickerInputProps = {
  onChange?: (date: string | null) => void;
  date: string | null;
  readonly?: boolean;
  variant?: FormFieldInputVariant;
};

export const DatePickerInput = ({
  date,
  onChange,
  readonly = false,
  variant = 'default',
}: DatePickerInputProps) => {
  const { dateFormat } = useDateTimeFormat();
  const isTransparent = variant === 'transparent';

  const [internalDate, setInternalDate] = useState(date);

  const { parseDateInputStringToPlainDate } =
    useParseDateInputStringToPlainDate();
  const { parseDateInputStringToJSDate } = useParseDateInputStringToJSDate();
  const { parsePlainDateToDateInputString } =
    useParsePlainDateToDateInputString();

  const { parseIMaskJSDateIMaskDateInputString } =
    useParseJSDateToIMaskDateInputString();

  const parseIMaskDateInputStringToJSDate = (newDateAsString: string) => {
    const newDate = parseDateInputStringToJSDate(newDateAsString);

    return newDate;
  };

  const pattern = getDateMask(dateFormat);
  const blocks = DATE_BLOCKS;

  const defaultValue = internalDate
    ? (parsePlainDateToDateInputString(internalDate) ?? undefined)
    : undefined;

  const { ref, setValue, value } = useIMask(
    {
      mask: Date,
      pattern,
      blocks,
      min: MIN_DATE,
      max: MAX_DATE,
      format: (date: any) =>
        isDefined(date) ? parseIMaskJSDateIMaskDateInputString(date) : '',
      parse: parseIMaskDateInputStringToJSDate,
      lazy: false,
      autofix: true,
    },
    {
      defaultValue,
      onComplete: (newValue) => {
        const parsedDate = parseDateInputStringToPlainDate(newValue);

        onChange?.(parsedDate);
      },
    },
  );

  useEffect(() => {
    if (internalDate !== date) {
      setInternalDate(date);
      if (isDefined(date)) {
        setValue(parsePlainDateToDateInputString(date));
      } else {
        setValue('');
      }
    }
  }, [date, internalDate, parsePlainDateToDateInputString, setValue]);

  return (
    <div
      {...stylex.props(
        styles.container,
        isTransparent ? styles.containerTransparent : styles.containerDefault,
      )}
    >
      <input
        {...stylex.props(
          styles.input,
          isTransparent ? styles.inputTransparent : styles.inputDefault,
        )}
        type="text"
        disabled={readonly}
        ref={ref as any}
        value={value}
        onChange={() => {}} // Prevent React warning
      />
    </div>
  );
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    display: 'flex',
    width: '100%',
  },
  containerDefault: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    height: spacing['--t-spacing-8'],
  },
  containerTransparent: {
    height: spacing['--t-spacing-6'],
  },
  input: {
    backgroundColor: 'transparent',
    borderStyle: 'none',
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    outline: 'none',
    width: '100%',
  },
  inputDefault: {
    fontWeight: 500,
    paddingBlock: '4px',
    paddingInline: '8px',
  },
  inputTransparent: {
    fontWeight: fontWeight['--t-font-weight-regular'],
    padding: 0,
  },
});
