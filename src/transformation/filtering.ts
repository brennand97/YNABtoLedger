import * as jsonLogic from 'json-logic-js';
import { Moment } from 'moment';
import moment = require('moment');

import { IConfiguration, IEntry, IFilter, IFilterSubOperations } from '../types';

export function createJsonLogic(config: IConfiguration): any {
    Object.entries(config.filters).forEach(([name, filter]: [string, IFilter]) => {
        jsonLogic.add_operation(`filter_${name}`, (entry: IEntry) => jsonLogic.apply(filter, {entry}));
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
            .some(splitName => typeof pattern === 'string'
                    ? splitName === pattern
                    : splitName.match(pattern));
    });

    return jsonLogic;
}

export function removeOperator(filter: IFilter, blacklistedOperator: string): IFilter {
    return Object.fromEntries(Object.entries(filter)
        .filter(([operator, _]: [string, IFilterSubOperations | IFilterSubOperations[]]) => {
            return operator !== blacklistedOperator;
        })
        .map(([operator, subOperation]: [string, IFilterSubOperations | IFilterSubOperations[]]) => {
            const handleSubOperation = (subOp: IFilterSubOperations) => {
                if (typeof subOp === 'object' && subOp !== null) {
                    const cleanedOp = removeOperator(subOp, blacklistedOperator);
                    return Object.keys(cleanedOp).length === 0 && cleanedOp.constructor === Object
                        ? null
                        : cleanedOp;
                } else {
                    return subOp as string | number;
                }
            };
            if (Array.isArray(subOperation)) {
                return [
                    operator,
                    subOperation
                        .map(handleSubOperation)
                        .filter((subOp: IFilterSubOperations) => subOp !== null)
                ];
            } else {
                return [operator, handleSubOperation(subOperation)];
            }
        }));
}

export function filterEntries(config: IConfiguration, entries: IEntry[]): IEntry[] {

    if (config.active_filter) {
        let filter: IFilter;
        if (typeof config.active_filter === 'string') {
            filter = config.filters[config.active_filter];
        } else {
            filter = config.active_filter;
        }

        // Remove 'method' operation due to security risk: https://www.npmjs.com/advisories/1542
        filter = removeOperator(filter, 'method');

        const logicHandler = createJsonLogic(config);

        entries = entries.filter(entry => logicHandler.apply(filter, {entry}));
    }

    if (config.start_date) {

        const startMoment: Moment = moment(config.start_date);
        entries = entries.filter(entry => moment(entry.recordDate) >= startMoment);

    }

    return entries;
}
