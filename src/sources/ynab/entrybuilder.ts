import { Account, Category, CategoryGroupWithCategories, SubTransaction, TransactionDetail, utils } from 'ynab';
import { DedupLogger } from '../../logging';
import { IEntry, SplitGroup } from '../../types';
import { hashCode, normalizeAccountName, validateAccountName } from '../../utils';

export class YNABEntryBuilder {
    public transactionLookup: (id: string) => TransactionDetail;
    public accountLookup: (id: string) => Account;
    public categoryLookup: (id: string) => Category;
    public categoryGroupLookup: (id: string) => CategoryGroupWithCategories;
    private dedupLogger: DedupLogger;

    constructor(
        transactionsLookup: ((id: string) => TransactionDetail),
        accountLookup: ((id: string) => Account),
        categoryLookup: ((id: string) => Category),
        categoryGroupLookup: ((id: string) => CategoryGroupWithCategories)
    ) {
        this.transactionLookup = transactionsLookup;
        this.accountLookup = accountLookup;
        this.categoryLookup = categoryLookup;
        this.categoryGroupLookup = categoryGroupLookup;
        this.dedupLogger = new DedupLogger('YNAB');
    }

    public buildEntry(transaction: TransactionDetail): IEntry {
        try {
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
        } catch (e) {
            console.error(`Could not build entry for YNAB transaction:
                           ${JSON.stringify(transaction)}`, e);
        }
    }

    private buildDefaultEntry(transaction: TransactionDetail): IEntry {
        return {
            cleared: this.isCleared(transaction.cleared),
            id: hashCode(transaction.id),
            memo: transaction.memo,
            payee: transaction.payee_name,
            recordDate: transaction.date,
            splits: [],
        };
    }

    private buildTransferEntry(transaction: TransactionDetail): IEntry {
        const account = this.accountLookup(transaction.account_id);
        const transferTransaction = this.transactionLookup(transaction.transfer_transaction_id);
        const transferAccount = this.accountLookup(transaction.transfer_account_id);
        return {
            ...this.buildDefaultEntry(transaction),
            id: hashCode([transaction.id, transferTransaction.id].sort().join('')),
            payee: 'Transfer',
            splits: [
                {
                    account: this.getAccountAccountName(
                        transaction,
                        account
                    ),
                    amount: this.getAccountAmount(transaction, account),
                    group: this.getAccountSplitGroup(account),
                },
                {
                    account: this.getAccountAccountName(
                        transferTransaction,
                        transferAccount
                    ),
                    amount: this.getAccountAmount(transferTransaction, transferAccount),
                    group: this.getAccountSplitGroup(transferAccount),
                },
            ],
        };
    }

    private buildStandardEntry(transaction: TransactionDetail): IEntry {
        const account = this.accountLookup(transaction.account_id);
        const category: Category = this.categoryLookup(transaction.category_id);
        const categoryGroup: CategoryGroupWithCategories = this.getCategoryGroup(category);
        return {
            ...this.buildDefaultEntry(transaction),
            splits: [
                {
                    account: this.getAccountAccountName(
                        transaction,
                        account
                    ),
                    amount: this.getAccountAmount(transaction, account),
                    group: this.getAccountSplitGroup(account),
                },
                {
                    account: this.getSplitAccountName(
                        transaction,
                        category,
                        categoryGroup
                    ),
                    amount: utils.convertMilliUnitsToCurrencyAmount(-transaction.amount),
                    group: this.getCategorySplitGroup(transaction, category),
                },
            ],
        };
    }

    private buildSplitEntry(transaction: TransactionDetail): IEntry {
        const account = this.accountLookup(transaction.account_id);
        return {
            ...this.buildDefaultEntry(transaction),
            splits: [
                {
                    account: this.getAccountAccountName(
                        transaction,
                        account
                    ),
                    amount: this.getAccountAmount(transaction, account),
                    group: this.getAccountSplitGroup(account),
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
                    };
                }),
            ],
        };
    }

    private isCleared(cleared: TransactionDetail.ClearedEnum): boolean {
        return cleared !== TransactionDetail.ClearedEnum.Uncleared;
    }

    private getCategoryGroup(category: Category): CategoryGroupWithCategories {
        if (category.hidden) {
            const originalGroup = this.categoryGroupLookup(category.original_category_group_id);
            if (originalGroup) {
                return originalGroup;
            }
        }
        return this.categoryGroupLookup(category.category_group_id);
    }

    private getAccountSplitGroup(account: Account): SplitGroup {
        switch (account.type) {
            case Account.TypeEnum.CreditCard:
            case Account.TypeEnum.LineOfCredit:
            case Account.TypeEnum.Mortgage:
            case Account.TypeEnum.OtherLiability:
                return SplitGroup.Liability;
            default:
                return SplitGroup.Asset;
        }
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

    private getAccountAccountName(
        transaction: TransactionDetail,
        account: Account): string {

        const accountName = (() => {
            switch (account.type) {
                case Account.TypeEnum.CreditCard:
                case Account.TypeEnum.LineOfCredit:
                    return `Credit:${account.name}`;
                case Account.TypeEnum.Mortgage:
                    return `Mortgage:${account.name}`;
                case Account.TypeEnum.OtherLiability:
                case Account.TypeEnum.OtherAsset:
                case Account.TypeEnum.Cash:
                case Account.TypeEnum.PayPal:
                    return `Other:${account.name}`;
                case Account.TypeEnum.Checking:
                    return `Checking:${account.name}`;
                case Account.TypeEnum.Savings:
                    return `Savings:${account.name}`;
                case Account.TypeEnum.InvestmentAccount:
                case Account.TypeEnum.MerchantAccount:
                    return `Investment:${account.name}`;
                default:
                    return account.name;
            }
        })();

        return this.validateAndNormalizeAccountName(accountName);
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

    private validateAndNormalizeAccountName(accountName: string): string {
        if (!validateAccountName(accountName)) {
            const normalizedAccountName = normalizeAccountName(accountName);
            this.dedupLogger.warn(
                'ACCOUNT_NAME_NORMALIZATION_WARNING',
                `Account name '${accountName}' is invalid, normalizing to '${normalizedAccountName}'`
            );
            return normalizedAccountName;
        }

        return accountName;
    }

    private getAccountAmount(transaction: TransactionDetail, account: Account): number {
        return utils.convertMilliUnitsToCurrencyAmount(transaction.amount);
    }

}
