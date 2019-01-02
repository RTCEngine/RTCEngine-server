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



const socketServer = socketio({
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ['websocket']
})



const setupSocketServer = async (server: Server) => {

    socketServer.on('connection', async (socket: SocketIO.Socket) => {

        let token = socket.handshake.query.token

        let data = jwt.decode(token, null, true)

        const peerId = data.user
        const roomId = data.room

        const room = server.getRoom(roomId)
        const peers = room.dumps()
        const peer = room.newPeer(peerId)

        const tm = new TransactionManager(socket)


        tm.on('cmd', async (cmd) => {

            console.dir(cmd)

            if (cmd.name === 'join') {
                socket.join(roomId)
                peer.init(cmd.data)

                const sdp = peer.createLocalDescription()
                cmd.accept({ sdp: sdp, room: peers})
                peer.on('renegotiationneeded', () => {
                    console.log('renegotiationneeded')
                })
                peer.on('incomingtrack', (track) => {
                    console.log('incomingtrack')
                })
                tm.broadcast(roomId, 'peerconnected', {peer:peer.dumps()})
                return
            }

            if (cmd.name === 'publish') {

                const sdp = cmd.data.sdp
                const streamId = cmd.data.stream.streamId
                const bitrate = cmd.data.stream.bitrate
                const attributes = cmd.data.stream.attributes
                room.setBitrate(streamId, bitrate)
                room.setAttribute(streamId, attributes)
                peer.processRemoteDescription(sdp)
                const answer = peer.createLocalDescription()
                cmd.accept({sdp:answer})
                // broadcast this stream 
                let data = {
                    peer: peer.dumps(),
                    stream: room.getStreamData(streamId)
                }
                tm.broadcast(roomId, 'streampublished', data)
                return
            }

            if (cmd.name === 'unpublish') {
                const sdp = cmd.data.sdp
                const streamId = cmd.data.stream.streamId
                peer.processRemoteDescription(sdp)
                const answer = peer.createLocalDescription()
                cmd.accept({sdp:answer})
                // broadcast this unpublish
                let data = {
                    peer: peer.dumps(),
                    stream: room.getStreamData(streamId)
                }
                tm.broadcast(roomId, 'streamunpublished', data)
                return
            }

            if (cmd.name === 'subscribe') {
                const streamId = cmd.data.stream.streamId
                const stream = room.getIncomingStream(streamId)
                let outgoingStream = peer.getTransport().createOutgoingStream(stream.getId())

                for (let track of stream.getTracks()) {
                    const outgoing = outgoingStream.createTrack(track.getMedia())
                    outgoing.attachTo(track)

                    track.once('stopped',()=>{
                        outgoing.stop()
                    })
                }

                cmd.accept({ sdp: peer.createLocalDescription()})
                return
            }

            if (cmd.name === 'unsubscribe') {
                const streamId = cmd.data.stream.streamId
                const stream = peer.getOutgoingStream(streamId)
                if (stream) {
                    stream.stop()
                }
                cmd.accept({ sdp: peer.createLocalDescription()})
                return
            }

            if (cmd.name === 'answer') {
                const sdp = cmd.data.sdp
                peer.processRemoteDescription(sdp)
                cmd.accept()
                return
            }
            
            if (cmd.name === 'leave') {
                socket.disconnect(true)
                peer.close()
            }

            if (cmd.name === 'message') {
                cmd.accept()
                tm.broadcast(roomId,'message', cmd.data)
            }
            
        })

        tm.on('event', async (cmd) => {

            if (cmd.name === 'configure') {

                const streamId = cmd.data.streamId
                if (peer.getIncomingStreams().get(streamId)) {
                    tm.broadcast(roomId, 'configure', cmd.data)
                    return
                }

                let outgoingStream
                for (let stream of peer.getOutgoingStreams()) {
                    if (stream.getId() === streamId) {
                        outgoingStream = stream
                    }
                }

                if (!outgoingStream) {
                    return
                }

                if ('video' in data) {
                    let muting = cmd.data.muting
                    for (let track of outgoingStream.getVideoTracks()) {
                        track.mute(muting)
                    }
                }

                if ('audio' in data) {
                    let muting = cmd.data.muting
                    for (let track of outgoingStream.getAudioTracks()) {
                        track.mute(muting)
                    }
                }    
            }

            if (cmd.name === 'message') {
                tm.broadcast(roomId, 'message', cmd.data)
                return
            }

            if (cmd.name === 'leave') {
                socket.disconnect(true)
                peer.close()
            }
        })
        
        socket.on('disconnect', async () => {
            for (let stream of peer.getIncomingStreams()) {
                let data = {
                    peer: peer.dumps(),
                    stream: room.getStreamData(stream.getId())
                }
                tm.broadcast(roomId, 'streamunpublished', data)
            }
            tm.broadcast(roomId, 'peerremoved', {peer: peer.dumps()})
            peer.close()
            socket.leaveAll()
        })
    })
}


export default {
    socketServer,
    setupSocketServer
}