const MediaServer = require('medooze-media-server')
import MediaRouter from './router'
import config from './config'


class Context {
    private _routers:Map<string,MediaRouter>  = new Map()
    private _endpoint:any
    private _relayEndpoint:Map<string,any> = new Map()

    constructor(){}
    get endpoint(){
        if(this._endpoint) {
            return this._endpoint
        }
        
        this._endpoint = MediaServer.createEndpoint(config.endpoint)
        return this._endpoint
    }
    get routers() {
        return this._routers
    }
    get relayEndpoints() {
        return this._relayEndpoint
    }
}

const context = new Context()

export default context