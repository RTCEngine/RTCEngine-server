


const MediaServer = require('medooze-media-server')
import MediaRouter from './router'
import config from './config'


class Context {
    private _routers:Map<string,MediaRouter>  = new Map()
    private _endpoint:any

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
}

const context = new Context()

export default context