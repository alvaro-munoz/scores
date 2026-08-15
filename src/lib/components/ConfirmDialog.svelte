<script lang="ts">
  import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
  import { X } from '@lucide/svelte';

  interface Props {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
  }

  let {
    open,
    title,
    description,
    confirmLabel = 'Confirm',
    danger = true,
    onConfirm,
    onOpenChange,
  }: Props = $props();

  function confirm() {
    onConfirm();
    onOpenChange(false);
  }
</script>

<Dialog {open} onOpenChange={(d) => onOpenChange(d.open)} closeOnInteractOutside={false}>
  <Portal>
    <Dialog.Backdrop class="bg-surface-50-950/60 fixed inset-0 z-50" />
    <Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Dialog.Content class="card bg-surface-100-900 w-full max-w-sm space-y-4 p-5 shadow-xl">
        <header class="flex items-center justify-between">
          <Dialog.Title class="text-lg font-bold">{title}</Dialog.Title>
          <Dialog.CloseTrigger class="btn-icon btn-icon-sm hover:preset-tonal" aria-label="Close">
            <X size={16} />
          </Dialog.CloseTrigger>
        </header>
        <Dialog.Description class="text-sm opacity-75">{description}</Dialog.Description>
        <footer class="flex justify-end gap-2">
          <Dialog.CloseTrigger class="btn preset-tonal">Cancel</Dialog.CloseTrigger>
          <button
            type="button"
            class="btn {danger ? 'preset-filled-error' : 'preset-filled-primary'}"
            onclick={confirm}
          >
            {confirmLabel}
          </button>
        </footer>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog>
