import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for n8n's Node Details View (NDV).
 *
 * Everything is addressed through `data-test-id`, which n8n maintains as its own
 * test surface, so these selectors survive styling changes.
 */
export class Ndv {
	constructor(private readonly page: Page) {}

	async open(ndvPath: string): Promise<void> {
		await this.page.goto(ndvPath);
		await expect(this.root).toBeVisible();
	}

	get root(): Locator {
		return this.page.getByTestId('ndv');
	}

	get title(): Locator {
		return this.page.getByTestId('node-title-container');
	}

	get issues(): Locator {
		return this.page.getByTestId('node-issues');
	}

	get outputPanel(): Locator {
		return this.page.getByTestId('output-panel');
	}

	/** The parameter control for `name`, e.g. `recordId` -> `parameter-input-recordId`. */
	parameter(name: string): Locator {
		return this.page.getByTestId(`parameter-input-${name}`);
	}

	/** Current displayed value of a parameter (the label for options, not the raw value). */
	async parameterValue(name: string): Promise<string> {
		return this.parameter(name).locator('input').first().inputValue();
	}

	/**
	 * Names of every parameter currently rendered — the observable result of
	 * `displayOptions`. Reading test ids rather than label text keeps assertions
	 * stable if wording changes.
	 *
	 * n8n names two of its three parameter shapes in the DOM:
	 *   - simple params -> `{name}-parameter-input-options-container`
	 *   - fixedCollection -> `fixed-collection-{name}`
	 * `collection` params (Update Fields, Additional Fields) carry no name at all,
	 * only `collection-parameter-add`, so use `visibleParameterLabels` for those.
	 */
	async visibleParameterNames(): Promise<string[]> {
		const simple = await this.page
			.locator('[data-test-id$="-parameter-input-options-container"]')
			.evaluateAll((els) =>
				els
					.filter((el) => (el as HTMLElement).offsetParent !== null)
					.map((el) =>
						el.getAttribute('data-test-id')!.replace('-parameter-input-options-container', ''),
					),
			);

		const fixedCollections = await this.page
			.locator('[data-test-id^="fixed-collection-"]')
			.evaluateAll((els) =>
				els
					.filter((el) => (el as HTMLElement).offsetParent !== null)
					.map((el) => el.getAttribute('data-test-id')!.replace('fixed-collection-', '')),
			);

		return [...new Set([...simple, ...fixedCollections])].filter((name) => name !== 'add');
	}

	/**
	 * Display labels of the rendered parameters. Needed for `collection` params,
	 * which n8n renders without a name-bearing test id.
	 */
	async visibleParameterLabels(): Promise<string[]> {
		const labels = await this.page
			.getByTestId('parameter-item')
			.evaluateAll((els) =>
				els
					.filter((el) => (el as HTMLElement).offsetParent !== null)
					.map((el) => (el as HTMLElement).innerText.split('\n')[0].trim()),
			);
		return labels.filter(Boolean);
	}

	/**
	 * Opens a dropdown and returns its options.
	 *
	 * Element Plus renders every select's menu into a body-level popper and leaves
	 * the hidden ones in the DOM, so an unscoped `.el-select-dropdown__item` query
	 * returns options from *all* selects on the page. `:visible` scopes to the one
	 * that is actually open.
	 */
	async openDropdown(name: string): Promise<string[]> {
		await this.clickSelect(name);
		const items = this.page.locator('.el-select-dropdown__item:visible');
		await expect(items.first()).toBeVisible();
		return (await items.allInnerTexts()).map((t) => t.trim());
	}

	async selectOption(name: string, optionLabel: string): Promise<void> {
		await this.clickSelect(name);
		await this.page
			.locator('.el-select-dropdown__item:visible', { hasText: optionLabel })
			.first()
			.click();
	}

	/**
	 * Opens a select by clicking its inner `<input>`.
	 *
	 * Element Plus binds the open handler to that input, not to the `.el-select`
	 * wrapper or `.select-trigger` — clicking either of those leaves the menu shut.
	 *
	 * A `loadOptions` select renders **disabled** until its remote request resolves,
	 * so the click has to wait for it to become enabled. Clicking early is the one
	 * failure mode worth guarding: a disabled input silently swallows the open, and
	 * the resulting empty dropdown looks exactly like a broken `loadOptions`.
	 */
	private async clickSelect(name: string): Promise<void> {
		const input = this.parameter(name).locator('input').first();
		await input.waitFor({ state: 'attached' });
		await expect(input).toBeEnabled({ timeout: 20_000 });
		await input.click();
	}

	/** Runs just this node and waits for the run to settle. */
	async executeNode(): Promise<void> {
		await this.page.getByTestId('node-execute-button').first().click();
		await expect(this.page.getByTestId('node-execute-button').first()).toBeEnabled({
			timeout: 45_000,
		});
	}

	/** Visible text of the output panel, covering both success data and errors. */
	async outputText(): Promise<string> {
		return (await this.outputPanel.innerText()).trim();
	}
}
