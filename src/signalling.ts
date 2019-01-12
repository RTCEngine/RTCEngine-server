import * as socketio from 'socket.io'
import * as jwt from 'jwt-simple'

const TransactionManager = require('socketio-transaction')
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

        const tm = new TransactionManager(socket)

        tm.on('cmd', async (cmd) => {

            console.dir(cmd)

            switch(cmd.name) {
                case 'join': {
                    socket.join(roomId)
                    cmd.accept({room: room.dumps()})
                    break
                }
                case 'publish': {
                    const sdp = cmd.data.sdp
                    const publisherId = cmd.data.stream.publisherId
                    const streamData = cmd.data.stream.data

                    const router = room.newRouter()
                    routers.set(router.getId(), router)
                    router.once('close', () => {
                        routers.delete(router.getId())
                    })

                    const { answer } = await router.createPublisher(publisherId, sdp, streamData)
    
                    cmd.accept({sdp:answer})
                    // broadcast this stream 
                    tm.broadcast(roomId, 'streampublished', {
                        stream: router.dumps()
                    })
                    break
                }
                case 'unpublish': {
                    const publisherId = cmd.data.stream.publisherId
                    const router = room.getRouterByPublisher(publisherId)
    
                    await router.stopPublisher()
                    cmd.accept({})
    
                    // broadcast this unpublish
                    tm.broadcast(roomId, 'streamunpublished', {
                        stream: router.dumps()
                    })
                    break
                }
                case 'subscribe': {
                    const sdp = cmd.data.sdp
                    const publisherId = cmd.data.stream.publisherId
    
                    const router = room.getRouterByPublisher(publisherId)
    
                    const { answer,subscriberId } = await router.createSubscriber(sdp)

                    cmd.accept({ 
                        sdp: answer, 
                        stream: {
                            subscriberId: subscriberId, 
                            data: router.getData()
                        }
                    })
                    break  
                }
                case 'unsubscribe': {
                    const publisherId = cmd.data.stream.publisherId
                    const subscriberId = cmd.data.stream.subscriberId
    
                    const router = room.getRouterByPublisher(publisherId)
    
                    router.stopSubscriber(subscriberId)
                    cmd.accept({})
                    break
                }
            }
            
        })

        tm.on('event', async (cmd) => {

            if (cmd.name === 'configure') {

                const streamId = cmd.data.streamId
                // if (peer.getIncomingStreams().get(streamId)) {
                //     tm.broadcast(roomId, 'configure', cmd.data)
                //     return
                // }

                // let outgoingStream
                // for (let stream of peer.getOutgoingStreams().values()) {
                //     if (stream.getId() === streamId) {
                //         outgoingStream = stream
                //     }
                // }

                // if (!outgoingStream) {
                //     return
                // }

                // if ('video' in data) {
                //     let muting = cmd.data.muting
                //     for (let track of outgoingStream.getVideoTracks()) {
                //         track.mute(muting)
                //     }
                // }

                // if ('audio' in data) {
                //     let muting = cmd.data.muting
                //     for (let track of outgoingStream.getAudioTracks()) {
                //         track.mute(muting)
                //     }
                // }    
            }

            if (cmd.name === 'message') {
                tm.broadcast(roomId, 'message', cmd.data)
                return
            }

            if (cmd.name === 'leave') {
                socket.disconnect(true)
            }
        })
        
        socket.on('disconnect', async () => {

            for (let router of routers.values()) {
                tm.broadcast(roomId, 'streamunpublished', {
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