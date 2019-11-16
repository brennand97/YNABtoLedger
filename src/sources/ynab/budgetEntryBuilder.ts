import moment = require('moment');
import { Account, Category, CategoryGroupWithCategories, MonthDetail, TransactionDetail } from 'ynab';
import { AutomaticEntry } from '../../entries/AutomaticEntry';
import { StandardEntry } from '../../entries/StandardEntry';
import { EntryType, IEntry, SplitGroup } from '../../types';
import { hashCode, splitSort } from '../../utils';
import { YNABEntryBuilder } from './entryBuilder';

export class YNABBudgetEntryBuilder extends YNABEntryBuilder {
    private goalCategories: ((month: MonthDetail) => Category[]);

    constructor(
        transactionsLookup: ((id: string) => TransactionDetail),
        accountLookup: ((id: string) => Account),
        categoryLookup: ((id: string) => Category),
        categoryGroupLookup: ((id: string) => CategoryGroupWithCategories),
        goalCategories: ((month: MonthDetail) => Category[])
    ) {
        super(
            transactionsLookup,
            accountLookup,
            categoryLookup,
            categoryGroupLookup,
            'YNABBudgetEntryBuilder'
        );
        this.goalCategories = goalCategories;
    }

    public buildEntry(month: MonthDetail): StandardEntry {
        const goalCategories: Category[] = this.goalCategories(month);
        return new StandardEntry({
            ...this.buildDefaultEntry(month),
            splits: [
                {
                    account: 'Budget',
                    amount: this.convertAmount(
                        goalCategories.reduce((sum: number, category: Category) => sum - category.budgeted, 0)
                    ),
                    group: SplitGroup.Liability,
                },
                ...goalCategories.map(category => {
                        const categoryGroup: CategoryGroupWithCategories = this.getCategoryGroup(category);
                        return {
                            account: `Budget:${this.validateAndNormalizeAccountName(`${categoryGroup.name}:${category.name}`)}`,
                            amount: this.convertAmount(category.budgeted),
                            group: SplitGroup.Asset,
                        };
                    }),
            ].sort(splitSort),
        });
    }

    public buildAutomaticEntry(category: Category): AutomaticEntry {
        const categoryGroup: CategoryGroupWithCategories = this.getCategoryGroup(category);
        const splitGroup: SplitGroup = SplitGroup.Expense;
        const accountName: string = this.validateAndNormalizeAccountName(`${categoryGroup.name}:${category.name}`);
        const accountMatcher = `/${splitGroup}:${accountName}/`;
        return new AutomaticEntry({
            accountMatcher,
            id: hashCode(accountMatcher),
            recordDate: moment(0).format('YYYY-MM-DD'),
            splits: [
                {
                    account: 'Budget',
                    amount: 1.0,
                    group: SplitGroup.Liability,
                },
                {
                    account: `Budget:${accountName}`,
                    amount: -1.0,
                    group: splitGroup,
                },
            ].sort(splitSort),
            type: EntryType.Budget,
        });
    }

    private buildDefaultEntry(month: MonthDetail): Partial<StandardEntry> {
        return {
            cleared: true,
            currencySymbol: '$',
            id: hashCode(month.month),
            memo: month.note ? month.note : null,
            payee: 'Budget',
            recordDate: month.month,
            splits: [],
            type: EntryType.Budget,
        };
    }

}
