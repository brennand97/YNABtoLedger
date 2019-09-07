
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
