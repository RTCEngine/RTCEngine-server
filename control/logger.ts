
import * as debug from 'debug'

const SERVER_NAME = 'dotserver'

class Logger {
    private _debug: debug.IDebugger
    private _warn: debug.IDebugger
    private _error: debug.IDebugger

    constructor(prefix?: string) {
        if (prefix) {
            this._debug = debug(SERVER_NAME + ':DEBUG:' + prefix)
            this._warn = debug(SERVER_NAME + ':WARN:' + prefix)
            this._error = debug(SERVER_NAME + ':ERROR:' + prefix);
        }
        else {
            this._debug = debug(SERVER_NAME + ':DEBUG:')
            this._warn = debug(SERVER_NAME + ':WARN:')
            this._error = debug(SERVER_NAME + ':ERROR:')
        }

        this._debug.log = console.log.bind(console)
        this._warn.log = console.warn.bind(console)
        this._error.log = console.error.bind(console)

    }

    get debug() {
        return this._debug
    }

    get warn() {
        return this._warn
    }

    get error() {
        return this._error
    }

}

export default Logger