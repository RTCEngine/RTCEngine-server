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


const socketServer = socketio({
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ['websocket']
})


const setupSocketServer = async (server: Server) => {

    socketServer.on('connection', async (socket: SocketIO.Socket) => {

        let token = socket.handshake.query.token

        let data = jwt.decode(token, null, true)

        const userId = data.user
        const roomId = data.room

        let room = server.getRoom(roomId)

        if (!room) {
            room = server.Room(roomId)
        }

        const peer = new Peer(userId, server)

        socket.on('join', async (data: any, callback?: Function) => {

            room.addPeer(peer)

            socket.join(roomId)

            peer.init(data, room)

            // const tracks = room.getIncomingTracks()

            // for (let track of tracks.values()) {
            //     console.error('addout going track', track.getId())
            //     peer.addOutgoingTrack(track, track.stream)
            // }

            if (callback) {
                callback({
                    sdp: peer.getLocalDescription(),
                    room: room.dumps()
                })
            }

            socket.to(roomId).emit('peerConnected', {
                peer: peer.dumps()
            })



            peer.on('renegotiationneeded', () => {

                console.error('renegotiationneeded')

                // socket.emit('offer', {
                //     sdp: peer.getLocalDescription(),
                //     room: room.dumps()
                // }, (data) => {
                //     peer.processRemoteDescription(data)
                // })

            })

            //peer.emit('renegotiationneeded')

            peer.on('incomingtrack', (track) => {
                socket.emit('trackadded', {
                    trackId: track.getId()
                })
            })


            setTimeout(() => {
                
                const tracks = room.getIncomingTracks()
                for (let track of tracks.values()) {
                    console.error('addout going track', track.getId())
                    peer.addOutgoingTrack(track, track.stream)
                }

                socket.emit('offer', {
                    sdp: peer.getLocalDescription(),
                    room: room.dumps()
                }, (data) => {
                    peer.processRemoteDescription(data)
                })
                

            }, 5000);

        })

        socket.on('test', async (data:any, callback?:Function) => {
    
            const tracks = room.getIncomingTracks()

            for (let track of tracks.values()) {
                console.error('addout going track', track.getId())
                peer.addOutgoingTrack(track, track.stream)
            }

            const sdp = data.sdp
            peer.processRemoteDescription(sdp)
            const answer = peer.getLocalDescription()

            callback(answer)
            
        })

        socket.on('addtrack', async (data:any, callback?: Function) => {

            const sdp = data.sdp
            const streamId = data.track.streamId
            const trackId = data.track.trackId
            const bitrate = data.track.bitrate
            const attributes = data.track.attributes

            room.setBitrate(trackId, bitrate)
            room.setAttribute(trackId, attributes)

            peer.processRemoteDescription(sdp)

            // do nothing
            const answer = peer.getLocalDescription()

            callback(answer)
            // find a way to limit bandwidth

        })

        socket.on('removetrack', async (data: any, callback?: Function) => {

            const sdp = data.sdp
            const streamId = data.track.streamId
            const trackId = data.track.trackId

            peer.processRemoteDescription(sdp)

            // do nothing
            peer.getLocalDescription()

        })

        socket.on('configure', async (data: any, callback?: Function) => {

            const streamId = data.msid

            // localstream 
            // if (peer.getIncomingStreams().get(streamId)) {
            //     socket.to(room.getId()).emit('configure', data)
            //     return
            // }

            // const outgoingStream = peer.getOutgoingStreams().get(streamId)

            // if (!outgoingStream) {
            //     return
            // }

            // if ('video' in data) {
            //     let muting = data.muting

            //     for (let track of outgoingStream.getVideoTracks()) {
            //         track.mute(muting)
            //     }
            // }

            // if ('audio' in data) {
            //     let muting = data.muting

            //     for (let track of outgoingStream.getAudioTracks()) {
            //         track.mute(muting)
            //     }
            // }
        })

        socket.on('leave', async (data: any, callback?: Function) => {

            socket.disconnect(true)

            peer.close()
        })

        socket.on('message', async (data: any, callback?: Function) => {
            socket.to(room.getId()).emit('message', data)
        })

        socket.on('disconnect', async () => {
            socket.to(room.getId()).emit('peerRemoved', {
                peer: peer.dumps()
            })
            socket.leaveAll()
            peer.close()
        })
    })
}


export default {
    socketServer,
    setupSocketServer
}