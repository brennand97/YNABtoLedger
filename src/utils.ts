
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
