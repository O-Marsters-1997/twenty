export const getScopedCallingApplication = <TApplication>(
  callingApplication: TApplication | null | undefined,
): TApplication | undefined => callingApplication ?? undefined;
