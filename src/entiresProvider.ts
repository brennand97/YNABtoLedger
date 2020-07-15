import { DedupLogger } from './logging';
import * as ynab from './sources/ynab/index';
import { transform } from './transformation';
import { IEntry } from './types';

export class EntriesProvider {

    private logger: DedupLogger;

    constructor() {
        this.logger = new DedupLogger('EntriesProvider');
    }

    public async getEntries(budget: boolean): Promise<IEntry[]> {
        if (budget) {
            return this.getBankAndBudgetEntries();
        } else {
            return this.getBankEntries();
        }
    }

    public async getBankEntries(): Promise<IEntry[]> {
        const ynabEntries: IEntry[] = await ynab.getEntries({
            budget: false,
        });

        return transform(ynabEntries);
    }

    public async getBankAndBudgetEntries(): Promise<IEntry[]> {
        const ynabEntries: IEntry[] = await ynab.getEntries({
            budget: true,
        });

        return transform(ynabEntries);
    }

}
