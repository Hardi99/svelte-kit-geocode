import type { SelectedAddress, Lang } from '$lib/types';

const HISTORY_KEY = 'geocode_history';
const MAX_HISTORY = 5;

function loadHistory(): SelectedAddress[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
	} catch {
		return [];
	}
}

function saveHistory(history: SelectedAddress[]): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

class SearchStore {
	selectedAddress = $state<SelectedAddress | null>(null);
	searchHistory = $state<SelectedAddress[]>(loadHistory());
	lang = $state<Lang>('fr');

	setSelectedAddress(addr: SelectedAddress): void {
		this.selectedAddress = addr;
		this.searchHistory = [
			addr,
			...this.searchHistory.filter((h) => h.label !== addr.label)
		].slice(0, MAX_HISTORY);
		saveHistory(this.searchHistory);
	}

	clearSelection(): void {
		this.selectedAddress = null;
	}

	removeFromHistory(label: string): void {
		this.searchHistory = this.searchHistory.filter((h) => h.label !== label);
		saveHistory(this.searchHistory);
	}

	toggleLang(): void {
		this.lang = this.lang === 'fr' ? 'en' : 'fr';
	}
}

export const searchStore = new SearchStore();
