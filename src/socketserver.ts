import { EventEmitter } from 'events' 
import * as socketio from 'socket.io'
import * as jwt from 'jwt-simple'
import * as http from 'http'


const SemanticSDP = require('semantic-sdp')
const SDPInfo = SemanticSDP.SDPInfo


class SocketServer extends EventEmitter {

    private socketServer: SocketIO.Server

    constructor(httpserver:http.Server) {
        super()

        this.socketServer = socketio({
            pingInterval: 10000,
            pingTimeout: 5000,
            transports: ['websocket']
        })

        this.socketServer.attach(httpserver)

        this.socketServer.on('connection', async (socket: SocketIO.Socket) => {

        })
    }
}

export default SocketServer