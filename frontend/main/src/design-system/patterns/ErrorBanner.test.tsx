import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBanner } from 'design-system';
import { renderWithTheme } from 'test/renderWithTheme';

describe('ErrorBanner', () => {
  it('announces the message', () => {
    renderWithTheme(<ErrorBanner message="Could not load the class list." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the class list.');
  });

  it('offers no action when there is nothing to retry', () => {
    renderWithTheme(<ErrorBanner message="Could not load the class list." />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('runs the retry handler', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<ErrorBanner message="Could not load the class list." onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('lets the caller label the retry action', () => {
    renderWithTheme(
      <ErrorBanner
        message="Could not load the class list."
        onRetry={() => {}}
        retryLabel="Try again"
      />,
    );

    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
