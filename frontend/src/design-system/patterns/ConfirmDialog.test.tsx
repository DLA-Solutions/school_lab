import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from 'design-system';
import { renderWithTheme } from 'test/renderWithTheme';

const defaultProps = {
  open: true,
  title: 'Delete charge?',
  message: 'This action cannot be undone.',
  onConfirm: () => {},
  onCancel: () => {},
};

describe('ConfirmDialog', () => {
  it('shows the title and the message while open', () => {
    renderWithTheme(<ConfirmDialog {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Delete charge?');
    expect(dialog).toHaveTextContent('This action cannot be undone.');
  });

  it('stays hidden while closed', () => {
    renderWithTheme(<ConfirmDialog {...defaultProps} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirms when the confirm button is pressed', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('cancels when the cancel button is pressed', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('cancels when Escape is pressed', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('uses the custom action labels when given', () => {
    renderWithTheme(
      <ConfirmDialog {...defaultProps} destructive confirmLabel="Delete" cancelLabel="Keep" />,
    );

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
  });
});
