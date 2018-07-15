
function eqSet(as: Set<string>, bs: Set<string>): boolean {
    if (as.size !== bs.size) return false
    for (var a of as) if (!bs.has(a)) return false
    return true
}

export {
    eqSet
}