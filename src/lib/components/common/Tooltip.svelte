<script lang="ts">
	import DOMPurify from 'dompurify';

	import { onDestroy } from 'svelte';

	import tippy, { type Instance, type Placement } from 'tippy.js';

	export let placement: Placement = 'top';
	export let content = `I'm a tooltip!`;
	export let touch = true;
	export let className = 'flex';
	export let theme = '';
	export let offset: [number, number] = [0, 4];
	export let allowHTML = true;
	export let tippyOptions = {};

	let tooltipElement: HTMLDivElement;
	let tooltipInstance: Instance | undefined;

	$: if (tooltipElement && content) {
		if (tooltipInstance) {
			tooltipInstance.setContent(DOMPurify.sanitize(content));
		} else {
			tooltipInstance = tippy(tooltipElement, {
				content: DOMPurify.sanitize(content),
				placement: placement,
				allowHTML: allowHTML,
				touch: touch,
				...(theme !== '' ? { theme } : { theme: 'dark' }),
				arrow: false,
				offset: offset,
				...tippyOptions
			});
		}
	} else if (tooltipInstance && content === '') {
		if (tooltipInstance) {
			tooltipInstance.destroy();
			tooltipInstance = undefined;
		}
	}

	onDestroy(() => {
		if (tooltipInstance) {
			tooltipInstance.destroy();
		}
	});
</script>

<div bind:this={tooltipElement} aria-label={DOMPurify.sanitize(content)} class={className}>
	<slot />
</div>
