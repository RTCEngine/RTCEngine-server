import * as bodyParser from 'body-parser'
import * as cookieParser from 'cookie-parser'
import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as net from 'net'
import * as WebSocket from 'ws'
import * as cors from 'cors'
import errorHandler = require('errorhandler')
import methodOverride = require('method-override')

const recorder = require('rtprecorder')

const MediaServer = require('medooze-media-server')

import Room from './room'
import Peer from './peer'
import config from './config'

import apiRouter from './api'

/**
 * The Application.
 *
 * @class Application
 */
export default class Application {

    public app: express.Application
    public server: http.Server
    public wsServer: WebSocket.Server
    public endpoint: any
    public recorder: any
    public rooms: Map<string, Room> = new Map()
    public peers: Map<string, Peer> = new Map()



    public static bootstrap(): Application {
        return new Application();
    }

    /**
     * Constructor.
     *
     * @class Application
     * @constructor
     */
    constructor() {
        //create expressjs application
        this.app = express()

        //create http server 
        this.server = this.app.listen(config.server.port, config.server.host)

        //create ws server 
        this.wsServer = new WebSocket.Server({ noServer: true })

        //init recorder 
        this.recorder = new recorder.RtpRecorder(config.recorder)

        //create media server
        this.endpoint = MediaServer.createEndpoint(config.server.host);

        //configure application
        this.config()

        //add routes
        this.routes()

        //add websocket server
        this.websocket()
    }

    /**
     * Configure application
     *
     * @class Application
     * @method config
     */
    public config() {
        //add static paths

        this.app.use(express.static('public'))

        this.app.use(cors())

        //mount json form parser
        this.app.use(bodyParser.json())

        //mount query string parser
        this.app.use(bodyParser.urlencoded({
            extended: true
        }))

        //mount override?
        this.app.use(methodOverride())

        // catch 404 and forward to error handler
        this.app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
            err.status = 404
            next(err)
        })
    }

    /**
     * Create and return Router.
     *
     * @class Application
     * @method config
     * @return void
     */
    private routes() {
        //use router middleware

        this.app.use(apiRouter)
    }

    private websocket() {
        this.server.on('upgrade', async (request: http.IncomingMessage, socket: net.Socket, upgradeHead: Buffer) => {
            if (!request.url) {
                return
            }
            this.wsServer.handleUpgrade(request, socket, upgradeHead, async (sock: WebSocket) => {
                let peer = new Peer(sock, this)
                this.peers.set(peer.id, peer)
                peer.on('close', () => {
                    this.peers.delete(peer.id)
                })
            })
        })
    }

    public getRoom(room: string): Room | undefined {
        if (this.rooms.has(room)) {
            return this.rooms.get(room)
        }
        return undefined
    }

    public addRoom(room: Room) {
        this.rooms.set(room.roomid, room)

        room.on('close', () => {
            this.rooms.delete(room.roomid)
        })
    }

}
