import * as bodyParser from 'body-parser'
import * as cookieParser from 'cookie-parser'
import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as net from 'net'
import * as cors from 'cors'
import errorHandler = require('errorhandler')
import methodOverride = require('method-override')


import apiRouter from './api'
import SocketServer from './socketserver'
import { EventEmitter } from 'events'


/**
 *
 *
 * @export
 * @class SignallingServer
 * @extends {EventEmitter}
 */
export default class SignallingServer extends EventEmitter {

    private app: express.Application
    private httpServer: http.Server
    private socketServer: SocketServer


    constructor(params?: any) {
        //create expressjs application
        super()

        this.app = express()

        //configure application
        this.config()

        //add routes
        this.routes()
    }

    
    /**
     *
     *
     * @param {number} port
     * @param {string} hostname
     * @param {Function} [callback]
     * @memberof Server
     */
    public start(port: number, hostname: string, callback?: Function) {

        this.httpServer = this.app.listen(port, hostname, callback)

        this.socketServer = new SocketServer(this.httpServer)

    }

    private config() {

        //add static paths
        this.app.use(express.static('public'))

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

    public dumps() {

    }
}
