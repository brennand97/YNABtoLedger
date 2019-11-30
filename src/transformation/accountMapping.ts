import { DedupLogger } from '../logging';
import { IConfiguration, IEntry, SplitGroup } from '../types';
import { flatMap, identity } from '../utils';

export function mapAccounts(config: IConfiguration, entries: IEntry[]) {
    const logger: DedupLogger = new DedupLogger('Account Mapping');

    const accountNames: string[] = Array.from(flatMap(entries
        .map(entry => entry.splits
            .map(split => `${split.group}:${split.account}`)))
        .reduce((set: Set<string>, accountName: string) => set.add(accountName), new Set()));

    if (config.account_name_map) {
        const regexList: RegExp[] = config.account_name_map.map(elm => new RegExp(elm.search));

        const accountNameMap: { [key: string]: string } =
            accountNames.reduce((map: { [key: string]: string }, accountName: string) => {
                const matchList: boolean[] = regexList.map(re => accountName.match(re) !== null);
                const index: number = matchList.findIndex(identity);
                map[accountName] = index < 0
                    ? accountName
                    : accountName.replace(regexList[index], config.account_name_map[index].replace);
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
