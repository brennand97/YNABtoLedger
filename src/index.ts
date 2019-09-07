import dotenv from 'dotenv';
dotenv.config();

import * as ynab from 'ynab';
import { normalize } from 'path';
import { TransactionsResponse, CategoriesResponse, AccountsResponse } from 'ynab';
import { EntryBuilder, Entry, Split } from './Entry';
import { findbyId } from './utils';
import { strict } from 'assert';

const access_token = process.env.YNAB_ACCESS_TOKEN;
const api = new ynab.API(access_token);

(async function() {

    const budgetResponse = await api.budgets.getBudgets();
    const budget = budgetResponse.data.budgets[1];

    console.log(`Budget Name: ${budget.name}`);

    const accountResponse : AccountsResponse = await api.accounts.getAccounts(budget.id);
    const accounts = accountResponse.data.accounts.map(a => normalizeName(a));

    const categoryResponse : CategoriesResponse = await api.categories.getCategories(budget.id);
    const categoryGroups = categoryResponse.data.category_groups.map(cg => normalizeName(cg));
    const categories = categoryGroups.map(e => e.categories).reduce((a, b) => a.concat(b), []).map(c => normalizeName(c));

    const transactionResponse : TransactionsResponse = await api.transactions.getTransactions(budget.id);
    const transactions = transactionResponse.data.transactions.map(t => normalizeName(t, ['account_name', 'category_name']));

    const entryBuilder: EntryBuilder = new EntryBuilder(
        (id: string) => findbyId(transactions, id),
        (id: string) => findbyId(accounts, id),
        (id: string) => findbyId(categories, id),
        (id: string) => findbyId(categoryGroups, id)
    );

    const entries: Array<Entry> = transactions.map(t => entryBuilder.buildEntry(t));

})();

function normalizeName<T>(object: T, keys: Array<string> = ['name']) : T {
    return object;
    for(let key of keys) {
        if (key in object && object[key]) {
            const words: Array<string> = object[key].split(' ');
            const name = words.map((w: string) => {
                w = w.replace(/([\-_])/g, x => '');
                if (w.match(/[a-z]/i)) {
                    return w.replace(/(\b[a-z\-_](?!\s))/gi, x => x.toLocaleUpperCase());
                }
            }).join('');
            object[key] = name;
        }
    }
    return object;
}

