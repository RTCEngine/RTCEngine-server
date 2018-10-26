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
import socketHandle from './signalling'
import { EventEmitter } from 'events'


export default class Server extends EventEmitter {

    private app: express.Application
    private httpServer: http.Server
   
    private rooms: Map<string, Room> = new Map()
    private peers: Set<Peer> = new Set()
    
    constructor(params:any) {
        //create expressjs application
        super()

        this.app = express()
        
       
        //configure application
        this.config()

        //add routes
        this.routes()
    }

    public start(port:number, hostname:string, callback?:Function) {
        
        this.httpServer = this.app.listen(port, hostname, callback)

        this.startSocketServer()

    }

    private config() {

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

    private startSocketServer() {

        socketHandle.socketServer.attach(this.httpServer)

        socketHandle.setupSocketServer(this)
    }
    
    public getRooms(): Room[] {
        return Array.from(this.rooms.values())
    }

    public getRoom(roomId: string): Room {
        return this.rooms.get(roomId)
    }

    public Room(roomId:string) : Room {
        const room = new Room(roomId)
        
        this.rooms.set(room.getId(), room)

        room.on('close', () => {
            this.rooms.delete(room.getId())
        })

        return room
    }
    
    public dumps() {
        let info = []
        for (const room of this.rooms.values()) {
            info.push(room.dumps)
        }
        return info
    }
}
