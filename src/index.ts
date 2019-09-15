import dotenv from 'dotenv';
dotenv.config();

import columnify from 'columnify';

import * as ynab from 'ynab';
import { normalize } from 'path';
import { TransactionsResponse, CategoriesResponse, AccountsResponse } from 'ynab';
import { EntryBuilder, Entry, Split } from './Entry';
import { findbyId } from './utils';
import { strict } from 'assert';

const access_token = process.env.YNAB_ACCESS_TOKEN;
const api = new ynab.API(access_token);

function normalizeName<T>(object: T, keys: Array<string> = ['name']) : T {
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

export default async function() {

    const budgetResponse = await api.budgets.getBudgets();
    const budget = budgetResponse.data.budgets[1];

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
    const uniqueEntries: Array<Entry> = Array.from(new Set(entries.map(e => e.id))).map(id => entries.find(e => e.id === id));

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

