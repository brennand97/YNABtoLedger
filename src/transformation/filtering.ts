import { Moment } from 'moment';
import moment = require('moment');
import * as jsonLogic from 'json-logic-js';

import { IConfiguration, IEntry, IFilter } from '../types';

export function createJsonLogic(config: IConfiguration): any {
    Object.entries(config.filters).forEach(([name, filter]: [string, IFilter]) => {
        jsonLogic.add_operation(`filter_${name}`, (entry: IEntry) => jsonLogic.apply(filter, {'entry': entry}));
    });

    jsonLogic.add_operation('regex', (pattern: string, flags: string) => new RegExp(pattern, flags));
    jsonLogic.add_operation('regex_match', (value: string, pattern: string | RegExp) => {
        if (typeof pattern === 'string') {
            pattern = new RegExp(pattern, 'gm');
        }
        value.match(pattern);
    });

    jsonLogic.add_operation('moment', moment);

    jsonLogic.add_operation('has_account', (entry: IEntry, pattern: string | RegExp) => {
        return entry.splits
            .map(split => `${split.group}:${split.account}`)
            .some(split_name => typeof pattern === 'string'
                    ? split_name === pattern
                    : split_name.match(pattern));
    })

    return jsonLogic;
}

export function filterEntries(config: IConfiguration, entries: IEntry[]): IEntry[] {

    if (config.active_filter) {
        let filter: IFilter;
        if (typeof config.active_filter === 'string') {
            filter = config.filters[config.active_filter];
        } else {
            filter = config.active_filter;
        }

        const jsonLogic = createJsonLogic(config);

        entries = entries.filter(entry => jsonLogic.apply(filter, {'entry': entry}));
    }

    if (config.start_date) {

        const startMoment: Moment = moment(config.start_date);
        entries = entries.filter(entry => moment(entry.recordDate) >= startMoment);

    }

    return entries;
}
