import { TransactionDetail, Account, Category, CategoryGroupWithCategories, SubTransaction, utils } from 'ynab';
import { hashCode, normalizeAccountName, validateAccountName } from '../../utils';
import { Entry, SplitGroup } from '../../types';

export class YNABEntryBuilder {
    transactionLookup: (id: string) => TransactionDetail;
    accountLookup: (id: string) => Account;
    categoryLookup: (id: string) => Category;
    categoryGroupLookup: (id: string) => CategoryGroupWithCategories;
    
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
    }

    public buildEntry(transaction: TransactionDetail): Entry {
        try {
            if (transaction.transfer_account_id !== null) {
                // Transfer Case
                return this.buildTransferEntry(transaction);
            }
            else if (transaction.subtransactions.length === 0) {
                // Standard Case
                return this.buildStandardEntry(transaction);
            }
            else {
                // Split Case
                return this.buildSplitEntry(transaction);
            }
        } catch (e) {
            console.error(`Could not build entry for YNAB transaction:
                           ${JSON.stringify(transaction)}`, e)
        }
    }

    private buildDefaultEntry(transaction: TransactionDetail): Entry {
        return {
            id: hashCode(transaction.id),
            recordDate: transaction.date,
            payee: transaction.payee_name,
            memo: transaction.memo,
            cleared: this.isCleared(transaction.cleared),
            splits: []
        };
    }

    private buildTransferEntry(transaction: TransactionDetail): Entry {
        const account = this.accountLookup(transaction.account_id);
        const transfer_transaction = this.transactionLookup(transaction.transfer_transaction_id);
        const transfer_account = this.accountLookup(transaction.transfer_account_id);
        return {
            ...this.buildDefaultEntry(transaction),
            id: hashCode([transaction.id, transfer_transaction.id].sort().join('')),
            payee: "Transfer",
            splits: [
                {
                    group: this.getAccountSplitGroup(account),
                    account: this.getAccountAccountName(
                        transaction,
                        account
                    ),
                    amount: this.getAccountAmount(transaction, account)
                },
                {
                    group: this.getAccountSplitGroup(transfer_account),
                    account: this.getAccountAccountName(
                        transfer_transaction,
                        transfer_account
                    ),
                    amount: this.getAccountAmount(transfer_transaction, transfer_account)
                }
            ]
        };
    }

    private buildStandardEntry(transaction: TransactionDetail): Entry {
        const account = this.accountLookup(transaction.account_id);
        const category: Category = this.categoryLookup(transaction.category_id);
        const categoryGroup: CategoryGroupWithCategories = this.getCategoryGroup(category);
        return {
            ...this.buildDefaultEntry(transaction),
            splits: [
                {
                    group: this.getAccountSplitGroup(account),
                    account: this.getAccountAccountName(
                        transaction,
                        account
                    ),
                    amount: this.getAccountAmount(transaction, account)
                },
                {
                    group: this.getCategorySplitGroup(transaction, category),
                    account: this.getSplitAccountName(
                        transaction,
                        category,
                        categoryGroup
                    ),
                    amount: utils.convertMilliUnitsToCurrencyAmount(-transaction.amount)
                }
            ]
        };
    }

    private buildSplitEntry(transaction: TransactionDetail): Entry {
        const account = this.accountLookup(transaction.account_id);
        return {
            ...this.buildDefaultEntry(transaction),
            splits: [
                {
                    group: this.getAccountSplitGroup(account),
                    account: this.getAccountAccountName(
                        transaction,
                        account
                    ),
                    amount: this.getAccountAmount(transaction, account)
                },
                ...transaction.subtransactions.map((sub_transaction: SubTransaction) => {
                    const category: Category = this.categoryLookup(sub_transaction.category_id);
                    const categoryGroup: CategoryGroupWithCategories = this.getCategoryGroup(category);
                    return {
                        group: this.getCategorySplitGroup(transaction, category),
                        account: this.getSplitAccountName(
                            transaction,
                            category,
                            categoryGroup
                        ),
                        amount: utils.convertMilliUnitsToCurrencyAmount(-sub_transaction.amount)
                    };
                })
            ]
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
            case "Inflows":
                if (transaction.payee_name === "Starting Balance") {
                    return SplitGroup.Equity;
                }
                else {
                    return SplitGroup.Income;
                }
            default:
                return SplitGroup.Expense;
        }
    }

    private getAccountAccountName(
        transaction: TransactionDetail,
        account: Account) : string
    {
        const accountName = normalizeAccountName((() => {
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
        })());

        let validation = validateAccountName(accountName)
        if (validation) {
            throw new Error(validation.error);
        }

        return accountName;
    }

    private getSplitAccountName(
        transaction: TransactionDetail, 
        category: Category, 
        categoryGroup: CategoryGroupWithCategories) : string
        {
        switch (this.getCategorySplitGroup(transaction, category)) {
            case SplitGroup.Income:
                return `${transaction.payee_name}`;
            case SplitGroup.Equity:
                return 'Starting Balance';
            case SplitGroup.Expense:
                return `${categoryGroup.name}:${category.name}`;
        }
    }

    private getAccountAmount(transaction: TransactionDetail, account: Account): number {
        return utils.convertMilliUnitsToCurrencyAmount(transaction.amount);
    }
    
}