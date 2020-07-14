import { IEntry, ISplit } from './types';

export function arraysEqual<T>(a: T[], b: T[]) {
    if (a === b) {
        return true;
    }
    if (a == null || b == null) {
        return false;
    }
    if (a.length !== b.length) {
        return false;
    }
    a.sort();
    b.sort();
    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

export function entrysEqual(a: IEntry, b: IEntry): boolean {
    if (a === b) { return true; }
    if (a == null || b == null) { return false; }

    function extractSplits(o: IEntry) {
        const { splits, ...obj } = o;
        return [ splits, obj ];
    }

    const [ splitsA, ...objA ] = extractSplits(a);
    const [ splitsB, ...objB ] = extractSplits(b);

    if (objA !== objB) { return false; }
    if (!arraysEqual(splitsA as ISplit[], splitsB as ISplit[])) { return false; }

    return true;
}

export function entrySort(a: IEntry, b: IEntry): number {
    if (a.recordDate === b.recordDate) {
        return a.id > b.id ? 1 : -1;
    }
    return a.recordDate > b.recordDate ? 1 : -1;
}

export function splitSort(a: ISplit, b: ISplit): number {
    if (a.amount === b.amount) {
        return a.account > b.account ? 1 : -1;
    }
    return a.amount < b.amount ? 1 : -1;
}

export function uniqueElements<T>(keyFunc: (T) => any, list: T[]): T[] {
    return Array.from(new Set(list.map(keyFunc))).map(id => list.find(e => keyFunc(e) === id));
}

export function reduceToMap<T, K, V>(
    array: T[],
    keyRetriever: ((elm: T) => K),
    valueRetriever: ((elm: T) => V)): Map<K, V> {
        return array.map((elm: T) => {
            return {
                key: keyRetriever(elm),
                value: valueRetriever(elm),
            };
        }).reduce((map: Map<K, V>, {key, value}: {key: K, value: V}) => {
            map.set(key, value);
            return map;
        }, new Map<K, V>());
}

export function findbyId<T, K>(list: T[], idExtractor: ((elm: T) => K), id: K): T {
    return list.find(elm => {
        const elmId = idExtractor(elm);
        return elmId ? elmId === id : false;
    });
}

export function findAllById<T, K>(list: T[], idExtractor: ((elm: T) => K), id: K): T[] {
    return list.filter(elm => {
        const elmId = idExtractor(elm);
        return elmId ? elmId === id : false;
    });
}

export function calculateMax<T>(
    entries: T[],
    filter: ((row: T) => boolean),
    valueGeter: ((row: T) => number)): number {
    return Math.max(...entries
        .filter(filter)
        .reduce((array: number[], entry: T) => [
            ...array,
            valueGeter(entry),
    ], [0]));
}

export function flatMap<T>(list: T[][]): T[] {
    return list.reduce((memo: T[], ts: T[]) => memo.concat(ts), []);
}

export function identity<T>(arg: T): T {
    return arg;
}

export function hashCode(s) {
    let h = 0;
    let i = 0;
    const l = s.length;
    if ( l > 0 ) {
      while (i < l) {
        // tslint:disable-next-line:no-bitwise
        h = (h << 5) - h + s.charCodeAt(i++) | 0;
      }
    }
    return h;
}

// ---------------------- Normalization and validation functions ----------------------

// Replace chains of spaces with one space, and remove illegal characters
export const normalizeAccountName = (account: string): string =>
    account.replace(/\s/gi, ' ').replace(/\s{2,}/gi, ' ').replace(/[()[\]#;%*|]/gi, '').trim();

export const validateAccountName = (account: string): boolean =>
    /^((?!\s{2}|[()[\]#;%*|]).)*$/gi.test(account); // No double space or one of: ()[]#;%*|

export function normalizeName<T>(object: T, keys: string[] = ['name']): T {
    for (const key of keys) {
        if (key in object && object[key]) {
            const words: string[] = object[key].split(' ');
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
