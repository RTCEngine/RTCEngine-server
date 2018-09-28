import * as socketio from 'socket.io'
import * as jwt from 'jwt-simple'

const SemanticSDP	= require('semantic-sdp')

const SDPInfo		= SemanticSDP.SDPInfo
const MediaInfo		= SemanticSDP.MediaInfo
const CandidateInfo	= SemanticSDP.CandidateInfo
const DTLSInfo		= SemanticSDP.DTLSInfo
const ICEInfo		= SemanticSDP.ICEInfo
const StreamInfo	= SemanticSDP.StreamInfo
const TrackInfo		= SemanticSDP.TrackInfo
const Direction		= SemanticSDP.Direction
const CodecInfo		= SemanticSDP.CodecInfo

import Server  from './server'
import Room from './room'
import Peer from './peer'
import config from './config'



async function socketHandle(socket: SocketIO.Socket, server: Server) {

    let token = socket.handshake.query.token

    let data = jwt.decode(token,null,true)

    const userId = data.user
    const roomId = data.room

    let room = server.getRoom(roomId) 

    if (!room) {
        room = server.Room(roomId)
    }
    
    const peer = new Peer(userId,server)

    socket.on('join', async (data:any, callback?:Function) => {

        room.addPeer(peer)

        socket.join(roomId)

        peer.init(data, room)

        const streams = room.getIncomingStreams()

        for (let stream of streams) {
            peer.subIncomingStream(stream)
        }
        
        socket.emit('joined', {
            sdp: peer.getLocalSDP().toString(),
            room : room.dumps()
        })

        socket.to(roomId).emit('peerConnected', {
            peer: peer.dumps()
        })

        peer.on('renegotiationneeded', (outgoingStream) => {

            socket.emit('offer', {
                sdp: peer.getLocalSDP().toString(),
                room: room.dumps()
            })

        })

    })

    socket.on('addStream', async (data:any, callback?:Function) => {

        const sdp = SDPInfo.process(data.sdp)
        const streamId = data.stream.msid
        const bitrate = data.stream.bitrate
        const attributes = data.stream.attributes

        room.setBitrate(streamId, bitrate)
        room.setAttribute(streamId, attributes)

        const streamInfo = sdp.getStream(streamId)

        if (!streamInfo) {
            // this should not happen
            return
        }

        peer.addStream(streamInfo)

        // we set bitrate, need find a better way to do this
        for (let media of peer.getLocalSDP().getMediasByType('video')) {
            media.setBitrate(bitrate)
        }

        socket.emit('streamAdded', {
            msid: streamInfo.getId()
        })

    })

    socket.on('removeStream', async (data:any, callback?:Function) => {

        const streamId = data.stream.msid

        const stream = peer.getIncomingStreams().get(streamId)

        peer.removeStream(stream.getStreamInfo())

    })

    socket.on('configure', async (data:any, callback?:Function) => {

        const streamId = data.msid

        // localstream 
        if (peer.getIncomingStreams().get(streamId)) {
            socket.to(room.getId()).emit('configure', data)
            return
        }

        const outgoingStream = peer.getOutgoingStreams().get(streamId)
        
        if (!outgoingStream) {
            return
        }

        if ('video' in data) {
            
            let muting = data.muting

            for (let track of outgoingStream.getVideoTracks()) {
                track.mute(muting)
            }
        }

        if ('audio' in data) {

            let muting = data.muting

            for (let track of outgoingStream.getAudioTracks()) {
                track.mute(muting)
            }
        }
        
    })

    socket.on('leave', async (data:any, callback?:Function) => {

        socket.disconnect(true)

        peer.close()
    })

    socket.on('message', async (data:any, callback?:Function) => {

        socket.to(room.getId()).emit('message', data)
    })

    socket.on('disconnect', async () => {

        socket.to(room.getId()).emit('peerRemoved', {
            peer: peer.dumps()
        })

        peer.close()

    })

}

export default socketHandle