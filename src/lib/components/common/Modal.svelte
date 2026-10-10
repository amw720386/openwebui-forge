<!-- Open WebUI v0.6.5 modal presentation with native focus trapping and Escape handling. -->
<script lang="ts">
 import { onDestroy } from 'svelte';
 export let show = false;
 export let size = 'md';
 let modalElement: HTMLDialogElement;
 $: if (modalElement) {
  if (show && !modalElement.open) modalElement.showModal();
  else if (!show && modalElement.open) modalElement.close();
 }
 const sizeToWidth = (size: string) => size === 'sm' ? 'w-[30rem]' : size === 'md' ? 'w-[42rem]' : 'w-[56rem]';
 onDestroy(() => modalElement?.close());
</script>
<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<dialog bind:this={modalElement} aria-label="Forge dialog"
 class="max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] m-auto p-0 border-0 rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-2xl {sizeToWidth(size)}"
 on:cancel|preventDefault={() => show = false} on:close={() => show = false}
 on:click={(event) => { if (event.target === modalElement) { const bounds = modalElement.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) show = false; } }}>
 <slot />
</dialog>
<style>dialog::backdrop { background: rgb(0 0 0 / 60%); } dialog[open] { animation: scaleUp 0.1s ease-out; } @keyframes scaleUp { from { transform: scale(0.985); opacity: 0; } to { transform: scale(1); opacity: 1; } }</style>
