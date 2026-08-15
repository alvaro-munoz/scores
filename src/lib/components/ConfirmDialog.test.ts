import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog.svelte';

function props(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    open: true,
    title: 'Delete game?',
    description: 'This cannot be undone.',
    confirmLabel: 'Delete',
    onConfirm: vi.fn(),
    onOpenChange: vi.fn(),
    ...overrides,
  };
}

describe('ConfirmDialog', () => {
  it('stays hidden when closed', () => {
    // Zag's Dialog keeps the content mounted in the DOM (for exit
    // animations) and hides it via a `hidden` attribute rather than
    // removing it, so "not in the document" is the wrong assertion here.
    render(ConfirmDialog, props({ open: false }));
    expect(screen.getByText('Delete game?')).not.toBeVisible();
  });

  it('renders the title, description, and confirm label when open', () => {
    render(ConfirmDialog, props());
    expect(screen.getByText('Delete game?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('confirming calls onConfirm then closes the dialog', async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(ConfirmDialog, props({ onConfirm, onOpenChange }));

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('cancelling closes the dialog without confirming', async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(ConfirmDialog, props({ onConfirm, onOpenChange }));

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
