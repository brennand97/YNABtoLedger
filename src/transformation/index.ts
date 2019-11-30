import { getConfig } from '../configuration';
import { IConfiguration, IEntry } from '../types';
import { filterByAccount } from './accountFiltering';
import { mapAccounts } from './accountMapping';

export async function transform(entries: IEntry[]) {
    const config: IConfiguration = await getConfig();

    entries = filterByAccount(config, entries);
    entries = mapAccounts(config, entries);

    return entries;
}
