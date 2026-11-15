import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import loaderStyles from '@ui/primitives/feedback/Loader/Loader.module.scss';
import { runComponentConformance } from '@test-utilities/conformance/runComponentConformance';
import { Button } from '../Button';

runComponentConformance({
  name: 'Button',
  element: <Button>Save</Button>,
  refInstanceOf: HTMLButtonElement,
});

runComponentConformance({
  name: 'Button link',
  element: (
    <Button href="#destination" nativeButton={false}>
      Open record
    </Button>
  ),
  refInstanceOf: HTMLAnchorElement,
  renderPropTagName: 'a',
});

runComponentConformance({
  name: 'Button custom element',
  element: (
    <Button nativeButton={false} render={<div />}>
      Open record
    </Button>
  ),
  refInstanceOf: HTMLDivElement,
});

describe('Button loading', () => {
  it('keeps content in its layout space behind the default centered spinner', () => {
    render(
      <Button
        loading
        startIcon={<span>Download icon</span>}
        endIcon={<span>Arrow icon</span>}
      >
        Installing (42%)
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Installing (42%)' });
    const content = screen.getByText('Installing (42%)').parentElement;
    const loader = button.querySelector<HTMLDivElement>(
      `.${loaderStyles.container}`,
    );

    expect(content).toContainElement(screen.getByText('Download icon'));
    expect(content).toContainElement(screen.getByText('Arrow icon'));
    expect(loader?.parentElement?.parentElement).toBe(button);
  });

  it.each([
    {
      loadingPosition: 'start' as const,
      replacedIcon: 'Download icon',
      preservedIcon: 'Arrow icon',
      loaderSibling: 'previousElementSibling' as const,
    },
    {
      loadingPosition: 'end' as const,
      replacedIcon: 'Arrow icon',
      preservedIcon: 'Download icon',
      loaderSibling: 'nextElementSibling' as const,
    },
  ])(
    'replaces the $loadingPosition icon while preserving children and the opposite icon',
    ({ loadingPosition, replacedIcon, preservedIcon, loaderSibling }) => {
      render(
        <Button
          loading
          loadingPosition={loadingPosition}
          startIcon={<span>Download icon</span>}
          endIcon={<span>Arrow icon</span>}
        >
          Installing (42%)
        </Button>,
      );

      const button = screen.getByRole('button', { name: 'Installing (42%)' });
      const label = screen.getByText('Installing (42%)');
      const loader = button.querySelector<HTMLDivElement>(
        `.${loaderStyles.container}`,
      );

      expect(screen.queryByText(replacedIcon)).not.toBeInTheDocument();
      expect(screen.getByText(preservedIcon)).toBeVisible();
      expect(loader).toBeInTheDocument();
      expect(label[loaderSibling]).toContainElement(loader);
      expect(loader?.parentElement).toHaveAttribute('aria-hidden', 'true');
    },
  );

  it.each(['start', 'end'] as const)(
    'adds the spinner at %s when no icon was supplied',
    (loadingPosition) => {
      render(
        <Button loading loadingPosition={loadingPosition}>
          Installing
        </Button>,
      );

      const button = screen.getByRole('button', { name: 'Installing' });

      expect(
        button.querySelector<HTMLDivElement>(`.${loaderStyles.container}`),
      ).toBeInTheDocument();
    },
  );

  it.each(['center', 'start', 'end'] as const)(
    'disables activation and communicates a busy state with the spinner at %s',
    async (loadingPosition) => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <Button loading loadingPosition={loadingPosition} onClick={onClick}>
          Save
        </Button>,
      );

      const button = screen.getByRole('button', { name: 'Save' });

      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      await user.click(button);
      await user.tab();
      await user.keyboard('{Enter} ');
      expect(onClick).not.toHaveBeenCalled();
    },
  );

  it.each(['center', 'start', 'end'] as const)(
    'preserves both icons and activation when loading is false with position %s',
    async (loadingPosition) => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <Button
          loadingPosition={loadingPosition}
          startIcon={<span>Download icon</span>}
          endIcon={<span>Arrow icon</span>}
          onClick={onClick}
        >
          Install
        </Button>,
      );

      const button = screen.getByRole('button', { name: 'Install' });

      expect(button).toBeEnabled();
      expect(button).not.toHaveAttribute('aria-busy');
      expect(screen.getByText('Download icon')).toBeVisible();
      expect(screen.getByText('Arrow icon')).toBeVisible();
      expect(
        button.querySelector<HTMLDivElement>(`.${loaderStyles.container}`),
      ).not.toBeInTheDocument();
      await user.click(button);
      expect(onClick).toHaveBeenCalledOnce();
    },
  );

  it('preserves custom link rendering and blocks activation while loading', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const ref = createRef<HTMLAnchorElement>();

    render(
      <Button
        ref={ref}
        href="#destination"
        nativeButton={false}
        role="link"
        render={
          <a href="#destination" data-custom-render>
            Installing
          </a>
        }
        target="_blank"
        rel="noreferrer"
        loading
        loadingPosition="end"
        onClick={onClick}
      >
        Installing
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'Installing' });

    expect(ref.current).toBe(link);
    expect(link).toHaveAttribute('href', '#destination');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(link).toHaveAttribute('data-custom-render');
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('aria-busy', 'true');
    await user.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });
});
