import { atom, useAtomValue, useStore } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PlaceAutocompleteSelect } from '@/geo-map/components/PlaceAutocompleteSelect';
import { SELECT_AUTOCOMPLETE_LIST_DROPDOWN_ID } from '@/geo-map/constants/SelectAutocompleteListDropDownId';
import { useRegisterInputEvents } from '@/ui/input/hooks/useRegisterInputEvents';
import { type FieldAddressDraftValue } from '@/object-record/record-field/ui/types/FieldInputDraftValue';
import { TextInput } from '@/ui/input/components/TextInput';
import { AutocompleteRoot } from '@/ui/input/components/AutocompleteRoot';
import { type AddressInputProps } from '@/ui/field/input/types/AddressInputProps';
import { CountrySelect } from '@/ui/input/components/internal/country/components/CountrySelect';
import { isDefined } from 'twenty-shared/utils';
import { Autocomplete } from 'twenty-ui/primitives/input';
import { media } from 'twenty-ui/theme/constants.stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { turnIntoEmptyStringIfWhitespacesOnly } from '~/utils/string/turnIntoEmptyStringIfWhitespacesOnly';

import { t } from '@lingui/core/macro';
import { type AllowedAddressSubField } from 'twenty-shared/types';
import { useAddressAutocomplete } from '@/ui/field/input/hooks/useAddressAutocomplete';
import { useAddressInputClickOutside } from '@/ui/field/input/hooks/useAddressInputClickOutside';
import { useCountryUtils } from '@/ui/field/input/hooks/useCountryUtils';
import { useFocusManagement } from '@/ui/field/input/hooks/useFocusManagement';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    maxWidth: { default: null, [media.mobile]: '200px' },
    minWidth: { default: null, [media.mobile]: '100px' },
    overflow: { default: null, [media.mobile]: 'hidden' },
    paddingBlock: '4px',
    paddingInline: spacing['--t-spacing-2'],
    width: { default: '344px', [media.mobile]: 'auto' },
  },
  item: {
    marginBottom: { default: '6px', [media.mobile]: spacing['--t-spacing-2'] },
  },
  halfRow: {
    display: { default: 'grid', [media.mobile]: 'block' },
    gap: spacing['--t-spacing-2'],
    gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr))',
    marginBottom: { default: '6px', [media.mobile]: spacing['--t-spacing-2'] },
  },
  halfRowCell: {
    marginBottom: { default: null, [media.mobile]: '7px' },
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputWithDropdownContainer: {
    position: 'relative',
    width: '100%',
  },
});

export const AddressInput = ({
  instanceId,
  value,
  onTab,
  onShiftTab,
  onEnter,
  onEscape,
  onClickOutside,
  onChange,
  subFields,
}: AddressInputProps) => {
  const store = useStore();
  const [internalValueAtom] = useState(() =>
    atom<FieldAddressDraftValue>(value),
  );
  const internalValue = useAtomValue(internalValueAtom);
  const setInternalValue = useCallback(
    (updatedValue: FieldAddressDraftValue) =>
      store.set(internalValueAtom, updatedValue),
    [internalValueAtom, store],
  );

  const addressStreet1InputRef = useRef<HTMLInputElement>(null);
  const addressStreet2InputRef = useRef<HTMLInputElement>(null);
  const addressCityInputRef = useRef<HTMLInputElement>(null);
  const addressStateInputRef = useRef<HTMLInputElement>(null);
  const addressPostcodeInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const inputRefs = useMemo(
    () => ({
      addressStreet1: addressStreet1InputRef,
      addressStreet2: addressStreet2InputRef,
      addressCity: addressCityInputRef,
      addressState: addressStateInputRef,
      addressPostcode: addressPostcodeInputRef,
    }),
    [],
  );

  const { findCountryCodeByCountryName } = useCountryUtils();

  const {
    placeAutocompleteData,
    tokenForPlaceApi,
    typeOfAddressForAutocomplete,
    setTypeOfAddressForAutocomplete,
    getAutocompletePlaceData,
    autoFillInputsFromPlaceDetails,
    closeDropdownOfAutocomplete,
  } = useAddressAutocomplete(onChange);

  const isFieldInputInSubFieldsAddress = useCallback(
    (field: AllowedAddressSubField): boolean => {
      if (isDefined(subFields)) {
        return subFields.includes(field);
      }
      return true;
    },
    [subFields],
  );

  const { getFocusHandler, handleTab, handleShiftTab } = useFocusManagement(
    inputRefs,
    internalValue,
    onTab,
    onShiftTab,
  );

  const getChangeHandler = useCallback(
    (field: keyof FieldAddressDraftValue) => (updatedAddressPart: string) => {
      if (isDefined(subFields) && !subFields.includes(field)) {
        return;
      }
      const updatedAddress = { ...internalValue, [field]: updatedAddressPart };
      setInternalValue(updatedAddress);
      onChange?.(updatedAddress);

      if (field === 'addressStreet1' || field === 'addressCity') {
        const countryCode = findCountryCodeByCountryName(
          updatedAddress.addressCountry ?? '',
        );
        if (field !== typeOfAddressForAutocomplete) {
          setTypeOfAddressForAutocomplete(field);
        }
        const isFieldCity = field === 'addressCity';
        getAutocompletePlaceData({
          address: updatedAddressPart,
          country: countryCode,
          isFieldCity,
        });
      }
    },
    [
      internalValue,
      setInternalValue,
      onChange,
      findCountryCodeByCountryName,
      typeOfAddressForAutocomplete,
      setTypeOfAddressForAutocomplete,
      getAutocompletePlaceData,
      subFields,
    ],
  );

  const handlePlaceSelection = useCallback(
    async (placeId: string) => {
      const placeAutocomplete = placeAutocompleteData?.find(
        (place) => place.placeId === placeId,
      );
      const token = tokenForPlaceApi ?? '';
      if (!isDefined(placeAutocomplete)) return;

      const text: string | undefined =
        typeOfAddressForAutocomplete !== 'addressCity'
          ? placeAutocomplete.text
          : undefined;

      const updatedAddress = await autoFillInputsFromPlaceDetails({
        placeId,
        token,
        addressStreet1: text,
        getInternalValue: () => store.get(internalValueAtom),
      });

      if (!isDefined(updatedAddress)) {
        return;
      }

      setInternalValue(updatedAddress);
    },
    [
      placeAutocompleteData,
      tokenForPlaceApi,
      typeOfAddressForAutocomplete,
      autoFillInputsFromPlaceDetails,
      internalValueAtom,
      setInternalValue,
      store,
    ],
  );

  const handleEnter = useCallback(() => {
    onEnter(internalValue);
    closeDropdownOfAutocomplete();
  }, [onEnter, internalValue, closeDropdownOfAutocomplete]);

  const handleEscape = useCallback(() => {
    onEscape(internalValue);
    closeDropdownOfAutocomplete();
  }, [onEscape, internalValue, closeDropdownOfAutocomplete]);

  const handleOutsideClick = useCallback(
    (event: MouseEvent | TouchEvent) => {
      onClickOutside?.({ event, newAddress: internalValue });
      closeDropdownOfAutocomplete();
    },
    [onClickOutside, internalValue, closeDropdownOfAutocomplete],
  );

  useRegisterInputEvents({
    focusId: instanceId,
    inputRef: wrapperRef,
    inputValue: internalValue,
    onEnter: handleEnter,
    onEscape: handleEscape,
    onTab: handleTab,
    onShiftTab: handleShiftTab,
  });

  useAddressInputClickOutside({
    inputRef: wrapperRef,
    onClickOutside: handleOutsideClick,
  });

  useEffect(() => {
    setInternalValue(value);
  }, [setInternalValue, value]);

  const renderInputWithAutocomplete = ({
    fieldType,
    label,
    autoFocus = false,
    isInHalfRow = false,
  }: {
    fieldType: 'addressStreet1' | 'addressCity';
    label: string;
    autoFocus?: boolean;
    isInHalfRow?: boolean;
  }) => (
    <div
      {...stylex.props(
        styles.inputWithDropdownContainer,
        isInHalfRow ? styles.halfRowCell : styles.item,
      )}
    >
      <AutocompleteRoot
        dropdownId={SELECT_AUTOCOMPLETE_LIST_DROPDOWN_ID}
        enabled={typeOfAddressForAutocomplete === fieldType}
        items={placeAutocompleteData}
        itemToStringValue={(place) => place.text}
        value={internalValue[fieldType] ?? ''}
        openOnValueChange={false}
        closeOnItemPress={false}
        onValueChange={(updatedValue) =>
          getChangeHandler(fieldType)(
            turnIntoEmptyStringIfWhitespacesOnly(updatedValue),
          )
        }
        onClose={closeDropdownOfAutocomplete}
      >
        <Autocomplete.Input
          aria-label={label}
          render={(inputProps) => (
            <TextInput
              inputProps={{ ...inputProps, className: undefined }}
              autoFocus={autoFocus}
              ref={inputRefs[fieldType]}
              label={label}
              fullWidth
              onFocus={getFocusHandler(fieldType)}
            />
          )}
        />
        <PlaceAutocompleteSelect
          list={placeAutocompleteData}
          onChange={handlePlaceSelection}
        />
      </AutocompleteRoot>
    </div>
  );

  return (
    <div ref={wrapperRef} {...stylex.props(styles.container)}>
      {isFieldInputInSubFieldsAddress('addressStreet1') &&
        renderInputWithAutocomplete({
          fieldType: 'addressStreet1',
          label: t`Address 1`,
          autoFocus: true,
        })}
      {isFieldInputInSubFieldsAddress('addressStreet2') && (
        <div {...stylex.props(styles.field, styles.item)}>
          <TextInput
            value={internalValue.addressStreet2 ?? ''}
            ref={inputRefs.addressStreet2}
            label={t`Address 2`}
            fullWidth
            onChange={getChangeHandler('addressStreet2')}
            onFocus={getFocusHandler('addressStreet2')}
          />
        </div>
      )}
      <div {...stylex.props(styles.halfRow)}>
        {isFieldInputInSubFieldsAddress('addressCity') &&
          renderInputWithAutocomplete({
            fieldType: 'addressCity',
            label: t`City`,
            isInHalfRow: true,
          })}
        {isFieldInputInSubFieldsAddress('addressState') && (
          <div {...stylex.props(styles.field, styles.halfRowCell)}>
            <TextInput
              value={internalValue.addressState ?? ''}
              ref={inputRefs.addressState}
              label={t`State`}
              fullWidth
              onChange={getChangeHandler('addressState')}
              onFocus={getFocusHandler('addressState')}
            />
          </div>
        )}
      </div>
      <div {...stylex.props(styles.halfRow)}>
        {isFieldInputInSubFieldsAddress('addressPostcode') && (
          <div {...stylex.props(styles.field, styles.halfRowCell)}>
            <TextInput
              value={internalValue.addressPostcode ?? ''}
              ref={inputRefs.addressPostcode}
              label={t`Post Code`}
              fullWidth
              onChange={getChangeHandler('addressPostcode')}
              onFocus={getFocusHandler('addressPostcode')}
            />
          </div>
        )}
        {isFieldInputInSubFieldsAddress('addressCountry') && (
          <div {...stylex.props(styles.field, styles.halfRowCell)}>
            <CountrySelect
              label={t`Country`}
              onChange={getChangeHandler('addressCountry')}
              selectedCountryName={internalValue.addressCountry ?? ''}
            />
          </div>
        )}
      </div>
    </div>
  );
};
