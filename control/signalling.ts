import * as socketio from 'socket.io'
import * as jwt from 'jwt-simple'

import Server from './server'
import Room from './room'
import Peer from './peer'
import config from './config'
import * as request from './request'

const socketServer = socketio({
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ['websocket']
})



const setupSocketServer = async (server: Server) => {

    socketServer.on('connection', async (socket: SocketIO.Socket) => {

        let roomId = socket.handshake.query.room
        let userId = socket.handshake.query.user

        let joined = false
        let published = false

        let medianode = config.medianode[Math.floor(Math.random()*config.medianode.length)]

        const room = new Room(roomId)
        
        socket.on('join', async (data:any, ack:Function) => {

            socket.join(roomId)

            joined = true

            console.dir(socket.handshake)

            let roomInfo
            
            try {
                roomInfo = await room.dumps()
            } catch (error) {
                console.error(error)
            }

            ack({
                room: roomInfo
            })
        })

        socket.on('publish', async (data:any, ack:Function) => {

            const sdp = data.sdp
            const publisherId = data.stream.publisherId
            const streamData = data.stream.data

            const { answer } = await room.createPublisher(medianode.node,publisherId,sdp)

            ack({sdp:answer})
            
            socket.to(roomId).emit('streampublished', {
                stream: {
                    publisherId: publisherId,
                    data: streamData
                }
            })
        })


        socket.on('unpublish', async (data:any, ack:Function) => {

            const publisherId = data.stream.publisherId

            await room.stopPublisher(medianode.node,publisherId)

            ack({})

            socket.to(roomId).emit('streamunpublished', {
                stream: {
                    publisherId:publisherId
                }
            })
        })


        socket.on('subscribe', async (data:any, ack:Function) => {

            const sdp = data.sdp
            const publisherId = data.stream.publisherId


            const stream = await room.getPublisher(publisherId)

            if (!stream) {
                console.dir(stream)
                ack({
                    error: 'can not find stream',
                    code:1000
                })
                return
            }

            // check media node, they are not in the same node
            if (stream.node !== medianode.node) {

                // check relay stream 
                const relay = await room.getNodeStreamRelay(medianode.node,publisherId)

                if (!relay) {
                    // now we need relay
                    await room.createStreamRelay(stream.node, medianode.node, publisherId)
                }
            }

            const { answer,subscriberId } = await room.createSubscriber(medianode.node,publisherId, sdp)

            ack({
                sdp: answer, 
                stream: {
                    subscriberId: subscriberId, 
                    data: stream.data
                }
            })
        
        })

        socket.on('unsubscribe', async (data:any, ack:Function) => {

            const publisherId = data.stream.publisherId
            const subscriberId = data.stream.subscriberId

            await room.stopSubscriber(medianode.node, publisherId, subscriberId)

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

            if (published) {
                socket.to(roomId).emit('streamunpublished', {
                    stream: {
                        publisherId: userId
                    }
                })

                await room.stopPublisher(medianode.node, userId)
            }
            

            socket.leaveAll()

            socketServer.of('/').in(roomId).clients( async (error, clients) => {
                if (clients && clients.length == 0) {
                    await room.shutdown()
                }
            })

        })
    })
}


export default {
    socketServer,
    setupSocketServer
}