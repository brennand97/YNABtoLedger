import { Account, Category, CategoryGroupWithCategories, MonthDetail, SubTransaction, TransactionDetail, utils } from 'ynab';
import { StandardEntry } from '../../entries/StandardEntry';
import { EntryType, SplitGroup } from '../../types';
import { hashCode, splitSort } from '../../utils';
import { YNABEntryBuilder } from './entryBuilder';

export class YNABTransactionEntryBuilder extends YNABEntryBuilder {

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
            'YNABTransactionEntryBuilder'
        );
    }

    public buildEntry(transaction: TransactionDetail): StandardEntry {
        if (transaction.transfer_account_id !== null) {
            // Transfer Case
            return this.buildTransferEntry(transaction);
        } else if (transaction.subtransactions.length === 0) {
            // Standard Case
            return this.buildStandardEntry(transaction);
        } else {
            // Split Case
            return this.buildSplitEntry(transaction);
        }
    }

    private buildDefaultEntry(transaction: TransactionDetail): Partial<StandardEntry> {
        return {
            cleared: this.isCleared(transaction.cleared),
            currencySymbol: '$',
            id: hashCode(transaction.id),
            memo: transaction.memo,
            payee: transaction.payee_name,
            recordDate: transaction.date,
            splits: [],
            type: EntryType.Transaction,
        };
    }

    private buildTransferEntry(transaction: TransactionDetail): StandardEntry {
        const account = this.accountLookup(transaction.account_id);
        const transferTransaction = this.transactionLookup(transaction.transfer_transaction_id);
        const transferAccount = this.accountLookup(transaction.transfer_account_id);
        return new StandardEntry({
            ...this.buildDefaultEntry(transaction),
            id: hashCode([transaction.id, transferTransaction.id].sort().join('')),
            payee: 'Transfer',
            splits: [
                {
                    account: this.getAccountAccountName(account),
                    amount: this.getTransactionAccountAmount(transaction, account),
                    group: this.getAccountSplitGroup(account),
                    memo: null,
                },
                {
                    account: this.getAccountAccountName(transferAccount),
                    amount: this.getTransactionAccountAmount(transferTransaction, transferAccount),
                    group: this.getAccountSplitGroup(transferAccount),
                    memo: null,
                },
            ].sort(splitSort),
        });
    }

    private buildStandardEntry(transaction: TransactionDetail): StandardEntry {
        const account = this.accountLookup(transaction.account_id);
        const category: Category = this.categoryLookup(transaction.category_id);
        const categoryGroup: CategoryGroupWithCategories = this.getCategoryGroup(category);
        return new StandardEntry({
            ...this.buildDefaultEntry(transaction),
            splits: [
                {
                    account: this.getAccountAccountName(account),
                    amount: this.getTransactionAccountAmount(transaction, account),
                    group: this.getAccountSplitGroup(account),
                    memo: null,
                },
                {
                    account: this.getSplitAccountName(
                        transaction,
                        category,
                        categoryGroup
                    ),
                    amount: utils.convertMilliUnitsToCurrencyAmount(-transaction.amount),
                    group: this.getCategorySplitGroup(transaction, category),
                    memo: null,
                },
            ].sort(splitSort),
        });
    }

    private buildSplitEntry(transaction: TransactionDetail): StandardEntry {
        const account = this.accountLookup(transaction.account_id);
        return new StandardEntry({
            ...this.buildDefaultEntry(transaction),
            splits: [
                {
                    account: this.getAccountAccountName(account),
                    amount: this.getTransactionAccountAmount(transaction, account),
                    group: this.getAccountSplitGroup(account),
                    memo: null,
                },
                ...transaction.subtransactions.map((subTransaction: SubTransaction) => {
                    const category: Category = this.categoryLookup(subTransaction.category_id);
                    const categoryGroup: CategoryGroupWithCategories = this.getCategoryGroup(category);
                    return {
                        account: this.getSplitAccountName(
                            transaction,
                            category,
                            categoryGroup
                        ),
                        amount: utils.convertMilliUnitsToCurrencyAmount(-subTransaction.amount),
                        group: this.getCategorySplitGroup(transaction, category),
                        memo: subTransaction.memo,
                    };
                }),
            ].sort(splitSort),
        });
    }

    private isCleared(cleared: TransactionDetail.ClearedEnum): boolean {
        return cleared !== TransactionDetail.ClearedEnum.Uncleared;
    }

    private getCategorySplitGroup(transaction: TransactionDetail, category: Category): SplitGroup {
        switch (category.name) {
            case 'Inflows':
                if (transaction.payee_name === 'Starting Balance') {
                    return SplitGroup.Equity;
                } else {
                    return SplitGroup.Income;
                }
            default:
                return SplitGroup.Expense;
        }
    }

    private getSplitAccountName(
        transaction: TransactionDetail,
        category: Category,
        categoryGroup: CategoryGroupWithCategories): string {
        const accountName = (() => {
            switch (this.getCategorySplitGroup(transaction, category)) {
                case SplitGroup.Income:
                    return `${transaction.payee_name}`;
                case SplitGroup.Equity:
                    return 'Starting Balance';
                case SplitGroup.Expense:
                    return `${categoryGroup.name}:${category.name}`;
            }
        })();

        return this.validateAndNormalizeAccountName(accountName);
    }

    private getTransactionAccountAmount(transaction: TransactionDetail, account: Account): number {
        return this.convertAmount(transaction.amount);
    }

}
