import { CommandMenuOpenContainer } from '@/command-menu/components/CommandMenuOpenContainer';
import { SidePanelRouter } from '@/side-panel/components/SidePanelRouter';
import { isSidePanelOpenedState } from '@/side-panel/states/isSidePanelOpenedState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

import { AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  commandMenuMobileFullScreenContainer: {
    height: '100%',
    width: '100%',
  },
});

export const CommandMenuForMobile = () => {
  const isSidePanelOpened = useAtomStateValue(isSidePanelOpenedState);

  return (
    <AnimatePresence>
      {isSidePanelOpened && (
        <>
          {createPortal(
            <div {...stylex.props(styles.commandMenuMobileFullScreenContainer)}>
              <CommandMenuOpenContainer>
                <SidePanelRouter />
              </CommandMenuOpenContainer>
            </div>,
            document.body,
          )}
        </>
      )}
    </AnimatePresence>
  );
};
