import dotenv from 'dotenv';
dotenv.config();

import * as ynab from 'ynab';

const access_token = process.env.YNAB_ACCESS_TOKEN;
console.log(ynab.API);
const api = new ynab.API(access_token);

(async function() {

    const budgetResponse = await api.budgets.getBudgets();
    const budgets = budgetResponse.data.budgets;
    for (let budget of budgets) {
        console.log(`Budget Name: ${budget.name}`);
    }

})();