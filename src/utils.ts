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

export function entrySort(a: IEntry, b: IEntry) {
    if (a.recordDate === b.recordDate) {
        return a.id > b.id ? 1 : -1;
    }
    return a.recordDate > b.recordDate ? 1 : -1;
}

export function uniqueElements<T>(keyFunc: (T) => any, list: T[]): T[] {
    return Array.from(new Set(list.map(keyFunc))).map(id => list.find(e => keyFunc(e) === id));
}

export function findbyId(list, id) {
    return list.find(e => e.id ? e.id === id : false);
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
