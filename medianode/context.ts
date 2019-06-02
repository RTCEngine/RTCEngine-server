import * as os from 'os'
import MediaRouter from './router'
import config from './config'
import logger from '../lib/logger'

const MediaServer = require('medooze-media-server')

MediaServer.setPortRange(config.minMediaPort, config.maxMediaPort)


class Context {

    private _localEndpoints:any[] = []
    private _routers:Map<string,MediaRouter> = new Map()
    private _relayEndpoint:Map<string,any> = new Map()
    private _streamEndpoint:Map<string,any> = new Map()


    constructor(){

        let cpus = os.cpus().length
        if (config.numMediaWorkers >= cpus) {
            config.numMediaWorkers = cpus - 1
        } else if(config.numMediaWorkers == -1) {
            config.numMediaWorkers = cpus - 1
        }

        let numWorkers = config.numMediaWorkers
        for (let i=0;i<numWorkers;i++) {
            let endpoint = MediaServer.createEndpoint(config.endpoint)
            endpoint.setAffinity(i)
            this._localEndpoints.push(endpoint)
        }

        logger.info(`start ${numWorkers} media workers`)
    }

    getEndpoint(streamId:string){

        if(this._streamEndpoint.get(streamId)) {
            return this._streamEndpoint.get(streamId)
        }

        let endpoint = this._localEndpoints[Math.floor(Math.random()*this._localEndpoints.length)]
        this._streamEndpoint.set(streamId, endpoint)
        return endpoint
    }

    removeStreamEndpoint(streamId:string) {
        this._streamEndpoint.delete(streamId)
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

    get relayEndpoints() {
        return this._relayEndpoint
    }
}

const context = new Context()

export default context