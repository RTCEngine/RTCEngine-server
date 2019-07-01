import * as os from 'os'
import MediaRouter from './router'
import config from './config'
import logger from '../lib/logger'

const MediaServer = require('medooze-media-server')


class Context {


    private _routers:Map<string,MediaRouter> = new Map()

    private _endpoints: Map<string, any> = new Map()

    constructor(){}

    getEndpoint(streamId:string){

        if (this._endpoints.get(streamId)) {
            return this._endpoints.get(streamId)
        }

        let endpoint = MediaServer.createEndpoint(config.endpoint)
        this._endpoints.set(streamId, endpoint)

        let cpunumber = Math.floor(Math.random() * Math.floor(os.cpus.length))
        endpoint.setAffinity(cpunumber)
        return endpoint
    }

    hasEndpoint(streamId:string) {
        return this._endpoints.has(streamId)
    }
    removeEndpoint(streamId:string) {
        this._endpoints.delete(streamId)
    }

    
    getRouter(routerId:string) {
        return this._routers.get(routerId)
    }

    addRouter(routerId:string,router:MediaRouter){
        this._routers.set(routerId, router)
    }
    removeRouter(routerId:string) {
        this._routers.delete(routerId)
    }

}


const context = new Context()

export default context