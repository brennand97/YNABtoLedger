import { Entry, Split } from "./types";

export function arraysEqual<T>(a: Array<T>, b: Array<T>) {
    if (a === b)
        return true;
    if (a == null || b == null)
        return false;
    if (a.length != b.length)
        return false;
    a.sort();
    b.sort();
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}

export function entrysEqual(a : Entry, b : Entry) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    
    function extractSplits(o : Entry) {
        const { splits, ...obj } = o;
        return [ splits, obj ];
    }

    const [ splits_a, ...obj_a ] = extractSplits(a);
    const [ splits_b, ...obj_b ] = extractSplits(b);

    if (obj_a !== obj_b) return false;
    if (!arraysEqual(<Array<Split>>splits_a, <Array<Split>>splits_b)) return false;

    return true;
}



export function entrySort(a: Entry, b: Entry) {
    if (a.recordDate === b.recordDate) {
        return a.id > b.id ? 1 : -1;
    }
    return a.recordDate > b.recordDate ? 1 : -1;
}

export function uniqueElements<T>(keyFunc: (T) => any, list: Array<T>) : Array<T> {
    return Array.from(new Set(list.map(keyFunc))).map(id => list.find(e => keyFunc(e) === id));
}



export function findbyId(list, id) {
    return list.find(e => e.id ? e.id === id : false);
}

export function hashCode(s) {
    var h = 0, l = s.length, i = 0;
    if ( l > 0 )
      while (i < l)
        h = (h << 5) - h + s.charCodeAt(i++) | 0;
    return h;
};



// ---------------------- Normalization and validation functions ----------------------

export const normalizeAccountName = (account: string) : string =>
    account.replace(/\s/gi, ' ').replace(/\s{2,}/gi, ' ').trim();

export const validateAccountName = (account: string) : {error?: string} =>
    /^[a-z]((?!\s{2}).)*$/gi.test(account) ? undefined : {error: 'Invalid account name'};

export function normalizeName<T>(object: T, keys: Array<string> = ['name']) : T {
    for(let key of keys) {
        if (key in object && object[key]) {
            const words: Array<string> = object[key].split(' ');
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
