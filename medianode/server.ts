import * as bodyParser from 'body-parser'
import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as cors from 'cors'
import methodOverride = require('method-override')

import { EventEmitter } from 'events'
const MedoozeMediaServer = require('medooze-media-server')

import apiRouter from './api'
import config  from './config'
import context from './context'

/**
 *
 *
 * @export
 * @class MediaServer
 * @extends {EventEmitter}
 */
export default class MediaServer extends EventEmitter {

    private app: express.Application
    private httpServer: http.Server
    private params: any

    constructor(params?: any) {
        //create expressjs application
        super()

        this.params = params

        if (params.endpoint) {
            config.endpoint = params.endpoint
        }

        if (params.capabilities){
            config.capabilities = params.capabilities
        }
        
        MedoozeMediaServer.enableLog(config.log)
        MedoozeMediaServer.enableDebug(config.debug)
        MedoozeMediaServer.enableUltraDebug(config.ultraDebug)
        MedoozeMediaServer.setPortRange(config.minMediaPort, config.maxMediaPort)
    
        context.initContext()
        
        this.app = express()

        //configure application
        this.config()

        //add routes
        this.routes()
    }


    /**
     * @param {number} port
     * @param {string} hostname
     * @param {Function} [callback]
     * @memberof Server
     */
    public start(port: number, hostname: string, callback?: Function) {
        this.httpServer = this.app.listen(port, hostname, callback)
    }

    private config() {

        this.app.use(cors())

        this.app.enable('trust proxy')

        //mount json form parser
        this.app.use(bodyParser.json())

        //mount query string parser
        this.app.use(bodyParser.urlencoded({
            extended: true
        }))

        //mount override?
        this.app.use(methodOverride())

        //catch 404 and forward to error handler
        this.app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
            err.status = 404
            next(err)
        })
    }
    
    private routes() {
        //use router middleware
        this.app.use(apiRouter)
    }

}
