import { DedupLogger } from '../logging';
import { IConfiguration, IEntry, SplitGroup, SearchReplaceArray } from '../types';
import { flatMap, identity } from '../utils';
import { stringify } from 'querystring';

export function mapAccounts(config: IConfiguration, entries: IEntry[]) {
    const logger: DedupLogger = new DedupLogger('Account Mapping');

    const accountNames: string[] = Array.from(flatMap(entries
        .map(entry => entry.splits
            .map(split => `${split.group}:${split.account}`)))
        .reduce((set: Set<string>, accountName: string) => set.add(accountName), new Set()));

    if (config.account_name_map) {

        let search_replace_array: SearchReplaceArray;
        if (!Array.isArray(config.account_name_map)) {
            search_replace_array = Object.entries(config.account_name_map)
                                         .map(([search, replace]: [string, string]) => {
                                             return { search, replace };
                                         }) as SearchReplaceArray;
        } else {
            search_replace_array = config.account_name_map as SearchReplaceArray;
        }

        const regexList: RegExp[] = search_replace_array.map(elm => new RegExp(elm.search));

        const accountNameMap: { [key: string]: string } =
            accountNames.reduce((map: { [key: string]: string }, accountName: string) => {
                const matchList: boolean[] = regexList.map(re => accountName.match(re) !== null);
                const index: number = matchList.findIndex(identity);
                map[accountName] = index < 0
                    ? accountName
                    : accountName.replace(regexList[index], search_replace_array[index].replace);
                return map;
            }, {});

        entries = entries.map(entry => {
            entry.splits = entry.splits.map(split => {
                const accountName = `${split.group}:${split.account}`;
                const newAccountName: string = accountNameMap[accountName];
                const [groupName, ...accountParts] = newAccountName.split(':');

                if (SplitGroup[groupName]) {
                    split.group = SplitGroup[groupName];
                    split.account = accountParts.join(':');
                } else {
                    logger.error(
                        'MAPPED_ACCOUNT_NAME_PREFIX_NOT_IN_SPLITGROP_ENUM',
                        `The provided mapped account name, ${newAccountName}, does not have a valid prefix`
                    );
                }

                return split;
            });

            return entry;
        });
    }

    return entries;
}
