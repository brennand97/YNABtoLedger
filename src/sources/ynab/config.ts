import prompts from 'prompts';
import { API, BudgetDetail, BudgetSummaryResponse } from 'ynab';
import { IYNABConfiguration } from '../../types';
import { initializeApi } from './api';

export default async function(): Promise<IYNABConfiguration> {

    const ynabKeyResponse = await prompts([
        {
            message: 'YNAB api access token ( https://api.youneedabudget.com/#quick-start )',
            name: 'api_access_token',
            type: 'text',
            validate: key => key.match(/^[A-Z0-9]/i) ? true : 'Invalid key, must only be alphanumeric',
        },
    ], {
        onCancel: () => {
            throw new Error('User failed to provide YNAB API access token');
        },
    });

    let api: API;
    try {
        api = await initializeApi(ynabKeyResponse.api_access_token);
    } catch (e) {
        console.error('Failed to initialize YNAB API with give access token', e);
        throw e;
    }

    let budgetResponse: BudgetSummaryResponse;
    let budgets: BudgetDetail[];
    try {
        budgetResponse = await api.budgets.getBudgets();
        budgets = budgetResponse.data.budgets;
    } catch (e) {
        console.error('Failed to retrieve budgets from YNAB API', e);
        throw e;
    }

    const ynabBudgetResponse = await prompts([
        {
            choices: budgets.map(b => {
                return {
                    description: budgetResponse.data.default_budget
                                 && b.id === budgetResponse.data.default_budget.id
                                    ? 'Default budget in YNAB'
                                    : '',
                    title: b.name,
                    value: b.id,
                };
            }),
            initial: budgetResponse.data.default_budget
                        ? budgets.findIndex(b => b.id === budgetResponse.data.default_budget.id)
                        : 0,
            message: 'Pick a primary budget',
            name: 'primary_budget_id',
            type: 'select',
        },
    ]);

    return {
        api_access_token: ynabKeyResponse.api_access_token,
        primary_budget_id: ynabBudgetResponse.primary_budget_id,
    };

}
