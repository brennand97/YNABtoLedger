import { Account, Category, CategoryGroupWithCategories, TransactionDetail, MonthDetail } from 'ynab';
import { EntryType, IEntry, SplitGroup } from '../../types';
import { hashCode, splitSort } from '../../utils';
import { YNABEntryBuilder } from './entryBuilder';

export class YNABBudgetEntryBuilder extends YNABEntryBuilder {

    constructor(
        transactionsLookup: ((id: string) => TransactionDetail),
        accountLookup: ((id: string) => Account),
        categoryLookup: ((id: string) => Category),
        categoryGroupLookup: ((id: string) => CategoryGroupWithCategories)
    ) {
        super(
            transactionsLookup,
            accountLookup,
            categoryLookup,
            categoryGroupLookup,
            'YNABBudgetEntryBuilder'
        );
    }

    public buildEntry(month: MonthDetail): IEntry {
        return {
            ...this.buildDefaultEntry(month),
            splits: [
                {
                    account: 'Budget',
                    amount: month.categories.reduce((sum: number, category: Category) => sum - category.budgeted, 0),
                    group: SplitGroup.Liability,
                },
                ...month.categories
                    .filter(category => category.goal_type)
                    .map(category => {
                        const categoryGroup: CategoryGroupWithCategories = this.getCategoryGroup(category);
                        return {
                            account: `Budget:${categoryGroup.name}:${category.name}`,
                            amount: this.convertAmount(category.budgeted),
                            group: SplitGroup.Asset,
                        };
                    }),
            ].sort(splitSort),
        };
    }

    private buildDefaultEntry(month: MonthDetail): IEntry {
        return {
            cleared: true,
            id: hashCode(month.month),
            memo: `${month.month}${month.note ? ` - ${month.note}` : ''}`,
            payee: 'Budget',
            recordDate: month.month,
            splits: [],
            type: EntryType.Budget,
        };
    }

}
