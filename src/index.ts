import { TransactionsResponse, CategoriesResponse, AccountsResponse, API } from 'ynab';
import { EntryBuilder, Entry } from './Entry';
import { findbyId } from './utils';

async function getEntries(api: API) : Promise<Array<Entry>> {
    const budgetResponse = await api.budgets.getBudgets();
    const budget = budgetResponse.data.budgets[1];

    const accountResponse : AccountsResponse = await api.accounts.getAccounts(budget.id);
    const accounts = accountResponse.data.accounts;

    const categoryResponse : CategoriesResponse = await api.categories.getCategories(budget.id);
    const categoryGroups = categoryResponse.data.category_groups;
    const categories = categoryGroups.map(e => e.categories).reduce((a, b) => a.concat(b), []);

    const transactionResponse : TransactionsResponse = await api.transactions.getTransactions(budget.id);
    const transactions = transactionResponse.data.transactions;

    const entryBuilder: EntryBuilder = new EntryBuilder(
        (id: string) => findbyId(transactions, id),
        (id: string) => findbyId(accounts, id),
        (id: string) => findbyId(categories, id),
        (id: string) => findbyId(categoryGroups, id)
    );

    const entries: Array<Entry> = transactions.map(t => entryBuilder.buildEntry(t));
    const uniqueEntries: Array<Entry> = Array.from(new Set(entries.map(e => e.id))).map(id => entries.find(e => e.id === id));

    return uniqueEntries;
}

export default async function(api: API) {

    const uniqueEntries: Array<Entry> = await getEntries(api);

    const output = []
    for (let entry of uniqueEntries) {
        output.push({
            header: `${entry.recordDate} ${entry.cleared ? '*' : '!'} ${entry.payee}${entry.memo ? ` ; ${entry.memo}` : ''}`,
            rows: entry.splits.map(split => {
                return [`(${split.group}:${split.account})`, `\$${split.amount}`];
            })
        });
    }

    const maxRowWidth = output.reduce((a, e) => a.concat(e.rows.reduce((b, r) => b.concat(r), [])), []).reduce((max, r) => max > r.length ? max : r.length, 0);

    const columnSpacing = 4;
    const splitPadding = 4;
    for (let row of output) {
        console.log(row.header);
        for (let sub_row of row.rows) {
            let str = ' '.repeat(splitPadding);
            str += sub_row[0];
            str += ' '.repeat(maxRowWidth - sub_row[0].length + columnSpacing);
            str += sub_row[1];
            console.log(str);
        }
        console.log('');
    }

};

