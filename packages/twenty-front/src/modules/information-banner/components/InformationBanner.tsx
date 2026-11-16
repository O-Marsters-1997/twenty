import { InformationBannerComponentInstanceContext } from '@/information-banner/states/contexts/InformationBannerComponentInstanceContext';
import { informationBannerIsOpenComponentState } from '@/information-banner/states/informationBannerIsOpenComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconButton } from 'twenty-ui/components/input';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { type IconComponent, IconX } from 'twenty-ui/icon';
import {
  Banner,
  type BannerColor,
  type BannerStatus,
  type BannerVariant,
} from 'twenty-ui/primitives/feedback';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  text: {
    minWidth: '0',
  },
  content: {
    alignItems: 'center',
    display: 'flex',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing['--t-spacing-3'],
    justifyContent: 'center',
    minWidth: 0,
  },
  contentWithCloseButton: {
    marginLeft: '24px',
  },
  iconButton: {
    color: 'inherit',
  },
});

export const InformationBanner = ({
  message,
  color,
  status = 'info',
  variant = 'solid',
  buttonTitle,
  buttonIcon: ButtonIcon,
  buttonOnClick,
  isButtonDisabled = false,
  onClose,
  componentInstanceId,
}: {
  message: string;
  color?: BannerColor;
  status?: BannerStatus;
  variant?: BannerVariant;
  buttonTitle?: string;
  buttonIcon?: IconComponent;
  buttonOnClick?: () => void;
  isButtonDisabled?: boolean;
  onClose?: () => void;
  componentInstanceId: string;
}) => {
  const informationBannerIsOpen = useAtomComponentStateValue(
    informationBannerIsOpenComponentState,
    componentInstanceId,
  );

  return (
    <InformationBannerComponentInstanceContext.Provider
      value={{
        instanceId: componentInstanceId,
      }}
    >
      {informationBannerIsOpen && (
        <Banner color={color} status={status} variant={variant}>
          <div
            {...stylex.props(
              styles.content,
              isDefined(onClose) && styles.contentWithCloseButton,
            )}
          >
            <div {...stylex.props(styles.text)}>
              <OverflowingTextWithTooltip
                isFocusable
                text={<>{message}</>}
                tooltipContent={message}
              />
            </div>
            {buttonTitle && buttonOnClick && (
              <Banner.Action
                startIcon={isDefined(ButtonIcon) ? <ButtonIcon /> : undefined}
                onClick={buttonOnClick}
                disabled={isButtonDisabled}
              >
                {buttonTitle}
              </Banner.Action>
            )}
          </div>
          {isDefined(onClose) && (
            <IconButton
              {...stylex.props(styles.iconButton)}
              size="sm"
              variant="ghost"
              onClick={onClose}
              aria-label={t`Close banner`}
            >
              <IconX />
            </IconButton>
          )}
        </Banner>
      )}
    </InformationBannerComponentInstanceContext.Provider>
  );
};
