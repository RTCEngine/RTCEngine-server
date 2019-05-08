import * as socketio from 'socket.io'
import * as jwt from 'jwt-simple'

const SemanticSDP = require('semantic-sdp')

const SDPInfo = SemanticSDP.SDPInfo
const MediaInfo = SemanticSDP.MediaInfo
const CandidateInfo = SemanticSDP.CandidateInfo
const DTLSInfo = SemanticSDP.DTLSInfo
const ICEInfo = SemanticSDP.ICEInfo
const StreamInfo = SemanticSDP.StreamInfo
const TrackInfo = SemanticSDP.TrackInfo
const Direction = SemanticSDP.Direction
const CodecInfo = SemanticSDP.CodecInfo

import Server from './server'
import Room from './room'
import Peer from './peer'
import config from './config'
import * as request from './request'
import Router from './router'

const socketServer = socketio({
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ['websocket']
})



const setupSocketServer = async (server: Server) => {

    socketServer.on('connection', async (socket: SocketIO.Socket) => {

        let token = socket.handshake.query.token

        let tokenInfo = jwt.decode(token, null, true)

        const roomId = tokenInfo.room

        const room = server.getRoom(roomId)

        const routers: Map<string,Router> = new Map()
        
        socket.on('join', async (data:any, ack:Function) => {

            socket.join(roomId)

            ack({
                room: room.dumps()
            })
        })

        socket.on('publish', async (data:any, ack:Function) => {

            const sdp = data.sdp
            const publisherId = data.stream.publisherId
            const streamData = data.stream.data

            const router = room.newRouter()
            routers.set(router.getId(), router)
            router.once('close', () => {
                routers.delete(router.getId())
            })

            const { answer } = await router.createPublisher(publisherId, sdp, streamData)

            ack({sdp:answer})
            
            socket.to(roomId).emit('streampublished', {
                stream: router.dumps()
            })
        })


        socket.on('unpublish', async (data:any, ack:Function) => {

            const publisherId = data.stream.publisherId
            const router = room.getRouterByPublisher(publisherId)

            await router.stopPublisher()

            ack({})

            socket.to(roomId).emit('streamunpublished', {
                stream: router.dumps()
            })
        })

        socket.on('subscribe', async (data:any, ack:Function) => {

            const sdp = data.sdp
            const publisherId = data.stream.publisherId

            const router = room.getRouterByPublisher(publisherId)

            const { answer,subscriberId } = await router.createSubscriber(sdp)

            ack({
                sdp: answer, 
                stream: {
                    subscriberId: subscriberId, 
                    data: router.getData()
                }
            })
        
        })

        socket.on('unsubscribe', async (data:any, ack:Function) => {

            const publisherId = data.stream.publisherId
            const subscriberId = data.stream.subscriberId

            const router = room.getRouterByPublisher(publisherId)

            router.stopSubscriber(subscriberId)

            ack({})
        })

        socket.on('configure', async (data:any, ack:Function) => {
            
        })

        socket.on('message', async (data:any, ack:Function) => {
            ack({})
            socket.to(roomId).emit('message', data)
        })

        socket.on('leave', async (data:any, ack:Function) => {
            socket.disconnect(true)
        })

        socket.on('disconnect', async () => {

            for (let router of routers.values()) {
                socket.to(roomId).emit('streamunpublished', {
                    stream: router.dumps()
                })
            }

            for (let router of routers.values()) {
                await router.stopPublisher()
            }

            socket.leaveAll()
        })
    })
}


export default {
    socketServer,
    setupSocketServer
}