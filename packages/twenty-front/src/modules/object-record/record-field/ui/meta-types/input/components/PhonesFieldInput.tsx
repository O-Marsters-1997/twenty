import { t } from '@lingui/core/macro';
import { usePhonesField } from '@/object-record/record-field/ui/meta-types/hooks/usePhonesField';
import { PhonesFieldMenuItem } from '@/object-record/record-field/ui/meta-types/input/components/PhonesFieldMenuItem';
import { recordFieldInputIsFieldInErrorComponentState } from '@/object-record/record-field/ui/states/recordFieldInputIsFieldInErrorComponentState';
import { phoneSchema } from '@/object-record/record-field/ui/validation-schemas/phoneSchema';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import * as stylex from '@stylexjs/stylex';
import { parsePhoneNumber, type E164Number } from 'libphonenumber-js';
import ReactPhoneNumberInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

import { MultiItemFieldInput } from './MultiItemFieldInput';

import { FieldInputEventContext } from '@/object-record/record-field/ui/contexts/FieldInputEventContext';
import { MULTI_ITEM_FIELD_INPUT_DROPDOWN_ID_PREFIX } from '@/object-record/record-field/ui/meta-types/input/constants/MultiItemFieldInputDropdownClickOutsideId';
import { createPhonesFromFieldValue } from '@/object-record/record-field/ui/meta-types/input/utils/phonesUtils';
import {
  type FieldPhonesValue,
  type PhoneRecord,
} from '@/object-record/record-field/ui/types/FieldMetadata';
import { phonesFieldValueSchema } from '@/object-record/record-field/ui/validation-schemas/phonesFieldValueSchema';
import { PhoneCountryPickerDropdownButton } from '@/ui/input/components/internal/phone/components/PhoneCountryPickerDropdownButton';
import { useContext } from 'react';
import { MULTI_ITEM_FIELD_DEFAULT_MAX_VALUES } from 'twenty-shared/constants';
import { isDefined } from 'twenty-shared/utils';
import {
  backgroundTransparent,
  borderColor,
  font,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { FieldMetadataType } from '~/generated-metadata/graphql';
import '~/third-party-styles/phones-field-input.css';
import { stripSimpleQuotesFromString } from '~/utils/string/stripSimpleQuotesFromString';

const styles = stylex.create({
  container: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 0,
    height: 'auto',
  },
  containerWithItem: {
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderTopColor: borderColor['--t-border-color-medium'],
    borderRightColor: borderColor['--t-border-color-medium'],
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderLeftColor: borderColor['--t-border-color-medium'],
    borderTopStyle: 'solid',
    borderRightStyle: 'solid',
    borderBottomStyle: 'solid',
    borderLeftStyle: 'solid',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 4,
    height: 30,
  },
  containerWithError: {
    borderTopColor: borderColor['--t-border-color-danger'],
    borderRightColor: borderColor['--t-border-color-danger'],
    borderBottomColor: borderColor['--t-border-color-danger'],
    borderLeftColor: borderColor['--t-border-color-danger'],
  },
  wrapper: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    color: fontColor['--t-font-color-primary'],
    fontFamily: font['--t-font-family'],
    fontSize: 'inherit',
    fontWeight: 'inherit',
    height: '100%',
    width: `calc(100% - ${spacing['--t-spacing-8']})`,
  },
});

export const PhonesFieldInput = () => {
  const { fieldDefinition, setDraftValue, draftValue } = usePhonesField();

  const { onEscape, onClickOutside, onEnter, onSubmit } = useContext(
    FieldInputEventContext,
  );

  const phones = createPhonesFromFieldValue(draftValue);

  const defaultCountry = stripSimpleQuotesFromString(
    fieldDefinition?.defaultValue?.primaryPhoneCountryCode,
  );

  const maxNumberOfValues =
    fieldDefinition.metadata.settings?.maxNumberOfValues ??
    MULTI_ITEM_FIELD_DEFAULT_MAX_VALUES;

  const parseArrayToPhonesValue = (phones: PhoneRecord[]) => {
    const [nextPrimaryPhone, ...nextAdditionalPhones] = phones;

    const nextValue: FieldPhonesValue = {
      primaryPhoneNumber: nextPrimaryPhone?.number ?? '',
      primaryPhoneCountryCode: nextPrimaryPhone?.countryCode ?? '',
      primaryPhoneCallingCode: nextPrimaryPhone?.callingCode ?? '',
      additionalPhones: nextAdditionalPhones,
    };
    const parseResponse = phonesFieldValueSchema.safeParse(nextValue);
    if (parseResponse.success) {
      return parseResponse.data;
    }
  };

  const handlePhonesChange = (updatedPhones: PhoneRecord[]) => {
    const nextValue = parseArrayToPhonesValue(updatedPhones);

    if (isDefined(nextValue)) {
      setDraftValue(nextValue);
    }
  };

  const validateInput = (input: string) => ({
    isValid: phoneSchema.safeParse(input).success,
    errorMessage: '',
  });

  const getShowPrimaryIcon = (index: number) =>
    index === 0 && phones.length > 1;
  const getShowSetAsPrimaryButton = (index: number) => index > 0;

  const setRecordFieldInputIsFieldInError = useSetAtomComponentState(
    recordFieldInputIsFieldInErrorComponentState,
  );

  const handleError = (hasError: boolean, values: any[]) => {
    setRecordFieldInputIsFieldInError(hasError && values.length === 0);
  };

  const handleClickOutside = (
    updatedPhones: PhoneRecord[],
    event: MouseEvent | TouchEvent,
  ) => {
    onClickOutside?.({
      newValue: parseArrayToPhonesValue(updatedPhones),
      event,
    });
  };

  const handleEscape = (updatedPhones: PhoneRecord[]) => {
    onEscape?.({ newValue: parseArrayToPhonesValue(updatedPhones) });
  };

  const handleEnter = (updatedPhones: PhoneRecord[]) => {
    onEnter?.({ newValue: parseArrayToPhonesValue(updatedPhones) });
  };

  const handleSubmit = (updatedPhones: PhoneRecord[]) => {
    onSubmit?.({
      newValue: parseArrayToPhonesValue(updatedPhones),
      skipClose: true,
    });
  };

  return (
    <MultiItemFieldInput
      items={phones}
      onChange={handlePhonesChange}
      onClickOutside={handleClickOutside}
      onEscape={handleEscape}
      onEnter={handleEnter}
      onSubmit={handleSubmit}
      placeholder={t`Phone`}
      fieldMetadataType={FieldMetadataType.PHONES}
      validateInput={validateInput}
      formatInput={(input) => {
        if (input === '') {
          return {
            number: '',
            callingCode: '',
            countryCode: '',
          };
        }

        const phone = parsePhoneNumber(input);
        if (phone !== undefined) {
          return {
            number: phone.nationalNumber,
            callingCode: `+${phone.countryCallingCode}`,
            countryCode: phone.country as string,
          };
        }

        return {
          number: '',
          callingCode: '',
          countryCode: '',
        };
      }}
      renderItem={({
        value: phone,
        index,
        handleEdit,
        handleSetPrimary,
        handleDelete,
      }) => (
        <PhonesFieldMenuItem
          key={index}
          dropdownId={`${MULTI_ITEM_FIELD_INPUT_DROPDOWN_ID_PREFIX}-${fieldDefinition.metadata.fieldName}-${index}`}
          showPrimaryIcon={getShowPrimaryIcon(index)}
          showSetAsPrimaryButton={getShowSetAsPrimaryButton(index)}
          phone={phone}
          onEdit={handleEdit}
          onSetAsPrimary={handleSetPrimary}
          onDelete={handleDelete}
        />
      )}
      renderInput={({
        value,
        onChange,
        onKeyDown,
        onFocus,
        onBlur,
        autoFocus,
        placeholder,
        hasError,
      }) => {
        return (
          <div
            {...stylex.props(
              styles.container,
              phones.length > 0 && styles.containerWithItem,
              phones.length > 0 && hasError && styles.containerWithError,
            )}
          >
            <div
              {...mergeClassName(
                stylex.props(styles.wrapper),
                'phones-field-input',
              )}
            >
              <ReactPhoneNumberInput
                autoFocus={autoFocus}
                placeholder={placeholder}
                value={value as E164Number}
                onChange={onChange as unknown as (newValue: E164Number) => void}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
                international={true}
                withCountryCallingCode={true}
                countrySelectComponent={PhoneCountryPickerDropdownButton}
                defaultCountry={defaultCountry}
              />
            </div>
          </div>
        );
      }}
      onError={handleError}
      maxItemCount={maxNumberOfValues}
    />
  );
};
