import * as ynab from 'ynab';
import { getConfig } from '../../configuration';

export async function initializeApi(access_token?: string) : Promise<ynab.API> {
    if (!access_token) {
        access_token = (await getConfig()).ynab.api_access_token;
    }
    return new ynab.API(access_token);
}
