import * as ynab from 'ynab';
import { getConfig } from '../../configuration';

export async function initializeApi(accessToken?: string): Promise<ynab.API> {
    if (!accessToken) {
        accessToken = (await getConfig()).ynab.api_access_token;
    }
    return new ynab.API(accessToken);
}
