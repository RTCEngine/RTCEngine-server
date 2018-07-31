import * as bodyParser from 'body-parser'
import * as cookieParser from 'cookie-parser'
import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as net from 'net'
import * as cors from 'cors'
import errorHandler = require('errorhandler')
import methodOverride = require('method-override')

import * as socketio from 'socket.io'

const MediaServer = require('medooze-media-server')

import Room from './room'
import Peer from './peer'
import config from './config'

import apiRouter from './api'
import { EventEmitter } from 'events'


export default class Server extends EventEmitter {

    public app: express.Application
    public server: http.Server
    public endpoint: any
    public rooms: Map<string, Room> = new Map()
    public peers: Map<string, Peer> = new Map()
    public io: socketio.Server


    constructor() {
        //create expressjs application
        super()

        this.app = express()

        //create http server 
        this.server = this.app.listen(config.server.port, config.server.host)

        //create media server
        this.endpoint = MediaServer.createEndpoint(config.server.host);

        //configure application
        this.config()

        //add routes
        this.routes()

        //socketio
        this.startSocketio()

    }


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


    private routes() {
        //use router middleware
        this.app.use(apiRouter)
    }

    private startSocketio() {
        
        this.io = socketio({
            pingInterval: 10000,
            pingTimeout: 5000,
            transports: ['websocket'] 
        })

        this.io.on('connection', async (socket:SocketIO.Socket) => {
            let peer = new Peer(socket,this)
            this.peers.set(peer.id, peer)

            this.emit('new-peer', peer)

            peer.on('close', () => {
                this.peers.delete(peer.id)
            })
        })

        this.io.attach(this.server)
    }

    public getRooms(): Room[] {
        return Array.from(this.rooms.values())
    }

    public getRoom(room: string): Room {

        return this.rooms.get(room)
    }

    public addRoom(room: Room, peer:Peer) {

        this.rooms.set(room.getId(), room)

        this.emit('new-room', room, peer)
        
        room.on('close', () => {
            this.rooms.delete(room.getId())
        })
    }

}
