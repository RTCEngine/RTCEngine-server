import { EventEmitter } from 'events'

import Message from './message'
import Room from './room'
import Server from './server'
import config from './config'
import * as utils from './utils'
import Logger from './logger'

const MediaServer = require('medooze-media-server')
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


const log = new Logger('peer')


class Peer extends EventEmitter {

    private usePlanB: boolean = true
    private socket: SocketIO.Socket
    private userId: string
    private roomId: string
    private closed: boolean = false
    // after Unified Plan is supported, we should set bitrate for every mediasource
    private bitrate: number = 0
    private room: Room

    private incomingStreams: Map<string, any> = new Map()
    private outgoingStreams: Map<string, any> = new Map()

    private localSdp: any
    private remoteSdp: any

    private server: Server
    private transport: any


    constructor(socket: SocketIO.Socket, server: Server) {
        super()

        this.server = server
        this.socket = socket

        socket.on('join', async (data:any, callback?:Function) => {
            await this.handleJoin(data)
        })

        socket.on('addStream', async (data:any, callback?:Function) => {
            await this.handleAddStream(data)
        })

        socket.on('removeStream', async (data:any, callback?:Function) => {
            await this.handleRemoveStream(data)
        })

        socket.on('configure', async (data:any, callback?:Function) => {
            await this.handleConfigure(data)
        })

        socket.on('leave', async (data:any, callback?:Function) => {
            socket.disconnect(true)
            this.close()
        })

        socket.on('message', async (data:any, callback?:Function) => {
            socket.to(this.roomId).emit('message', data)
        })

        socket.on('disconnect', async () => {
            socket.to(this.roomId).emit('peerRemoved', {
                peer: this.dumps()
            })
            this.close()
        })
    }

    public getId() {
        return this.userId
    }
    
    public getLocalSDP() {
        return this.localSdp
    }

    public getRemoteSDP() {
        return this.remoteSdp
    }

    public getIncomingStreams(): Map<string,any> {
        return this.incomingStreams
    }

    public getOutgoingStreams(): Map<string,any> {
        return this.outgoingStreams
    }

    public init(data:any, room:Room) {

        this.roomId = data.room
        this.userId = data.user

        this.room = room

        const offer = SDPInfo.process(data.sdp)

        if ('planb' in data) {
            this.usePlanB = !!<boolean>data.planb
        }

        const endpoint = this.server.getEndpoint()

        this.transport = endpoint.createTransport(offer)

        this.transport.setRemoteProperties(offer)

        if (offer.getMedia('audio')) {
            offer.getMedia('audio').setDirection(Direction.SENDRECV)
        }

        if (offer.getMedia('video')) {
            offer.getMedia('video').setDirection(Direction.SENDRECV)
        }

        const answer = offer.answer({
            dtls    : this.transport.getLocalDTLSInfo(),
            ice     : this.transport.getLocalICEInfo(),
            candidates: endpoint.getLocalCandidates(),
            capabilities: config.media.capabilities
        })

        this.transport.setLocalProperties({
            audio: answer.getMedia('audio'),
            video: answer.getMedia('video')
        })

        this.localSdp = answer
        this.remoteSdp = offer
    }

    public close() {

        log.debug('peer close')

        if (this.closed) {
            return
        }

        this.closed = true

        if (this.socket) {
            this.socket.leaveAll()
        }

        if (this.socket) {
            this.socket.disconnect()
        }

        for (let stream of this.incomingStreams.values()) {
            stream.stop()
        }

        for (let stream of this.outgoingStreams.values()) {
            stream.stop()
        }

        if (this.transport) {
            this.transport.stop()
        }

        this.incomingStreams.clear()
        this.outgoingStreams.clear()

        this.emit('close')
    }

    public unsubIncomingStream(incomingStream: any) {

        if (!this.outgoingStreams.get(incomingStream.getId())) {
            log.error("removeOutgoingStream: outstream does not exist", incomingStream.getId())
            return
        }

        const outgoingStream = this.outgoingStreams.get(incomingStream.getId())

        this.localSdp.removeStream(incomingStream.getStreamInfo())

        outgoingStream.stop()
    }

    public subIncomingStream(incomingStream: any,) {
        
        if (this.outgoingStreams.get(incomingStream.getId())) {
            log.error("subIncomingStream: outstream already exist", incomingStream.getId())
            return
        }

        const outgoingStream = this.transport.createOutgoingStream(incomingStream.getStreamInfo())
        
        this.localSdp.addStream(outgoingStream.getStreamInfo())

        this.outgoingStreams.set(outgoingStream.getId(), outgoingStream)

        outgoingStream.attachTo(incomingStream)

        incomingStream.on('stopped', () => {

            if (this.localSdp) {
                this.localSdp.removeStream(outgoingStream.getStreamInfo())
            }

            outgoingStream.stop()

            let exist = this.outgoingStreams.delete(outgoingStream.getId())

            if(exist) {
                this.emit('renegotiationneeded', outgoingStream)
            }
           
        })

    } 

    public addOutgoingStream(stream: any, emit = true) {

        if (this.outgoingStreams.get(stream.getId())) {
            log.error("addOutgoingStream: outstream already exist", stream.getId())
            return
        }

        const outgoingStream = this.transport.createOutgoingStream(stream.getStreamInfo())

        const info = outgoingStream.getStreamInfo()
        
        this.localSdp.addStream(info)

        this.outgoingStreams.set(outgoingStream.getId(), outgoingStream)

        outgoingStream.attachTo(stream)
        
        stream.on('stopped', () => {

            if (this.localSdp) {
                this.localSdp.removeStream(info)
            }
            
            outgoingStream.stop()

            let exist = this.outgoingStreams.delete(outgoingStream.getId())

            if(exist) {
                this.emit('renegotiationneeded', outgoingStream)
            }
           
        })

        if (emit) {

            this.emit('renegotiationneeded', outgoingStream)
        }
    }


    public addStream(streamInfo: any) {

        if (!this.transport) {
            log.error('do not have transport')
            return
        }

        const incomingStream = this.transport.createIncomingStream(streamInfo)

        this.incomingStreams.set(incomingStream.id, incomingStream)


        process.nextTick(() => {

            this.emit('stream', incomingStream)
        })

        this.remoteSdp.addStream(streamInfo)

        // now start to record 
        if (!(config.recorder && config.recorder.enable)) {
            return
        }

        const filename = 'recordings/' + incomingStream.id + '-' + Date.now() + '.mp4'

        const recorder = MediaServer.createRecorder(filename, {
            refresh:  config.recorder.refreshPeriod || 10000
        })

        recorder.record(incomingStream)

        incomingStream.on('stopped', () => {
            recorder.stop()
        })
    }


    public removeStream(streamInfo: any) {

        if (!this.transport) {
            log.error('do not have transport')
            return
        }

        let incomingStream = this.incomingStreams.get(streamInfo.getId())

        if (incomingStream) {
            incomingStream.stop()
        }

        this.incomingStreams.delete(streamInfo.getId())

        this.remoteSdp.removeStream(streamInfo)
    }


    public dumps():any {

        const incomingStreams = Array.from(this.incomingStreams.values())
        const streams = incomingStreams.map((stream) => {
            return {
                id: stream.getId(),
                bitrate: this.room.getBitrate(stream.getId()),
                attributes: this.room.getAttribute(stream.getId())
            }
        })
        const info = {
            id: this.userId,
            streams: streams
        }
        return info
    }

    private async handleJoin(data: any) {

        const room = <string>data.room
        const user = <string>data.user
        const offer = SDPInfo.process(data.sdp)

        this.roomId = room
        this.userId = user

        if ('planb' in data) {
            this.usePlanB = !!<boolean>data.planb
        }

        this.room = this.server.getRoom(this.roomId)

        if (!this.room) {
            this.room = new Room(this.roomId)
            this.server.addRoom(this.room)
        }

        this.room.addPeer(this)
        
        this.socket.join(this.roomId)

        const endpoint = this.server.getEndpoint()

        // ice and dtls
        this.transport = endpoint.createTransport(offer)

        this.transport.on('targetbitrate', (bitrate:number) => {
            log.debug('transport:bitrate', bitrate)
        })

        // audio and video
        this.transport.setRemoteProperties(offer)


        if (offer.getMedia('audio')) {
            offer.getMedia('audio').setDirection(Direction.SENDRECV)
        }

        if (offer.getMedia('video')) {
            offer.getMedia('video').setDirection(Direction.SENDRECV)
        }

        const answer = offer.answer({
            dtls    : this.transport.getLocalDTLSInfo(),
            ice     : this.transport.getLocalICEInfo(),
            candidates: endpoint.getLocalCandidates(),
            capabilities: config.media.capabilities
        })

        this.transport.setLocalProperties({
            audio: answer.getMedia('audio'),
            video: answer.getMedia('video')
        })

        this.localSdp = answer
        this.remoteSdp = offer

        const streams = this.room.getIncomingStreams()

        for (let stream of streams) {
            this.addOutgoingStream(stream, false)
        }
        

        // After first  addStream, we should listen 'renegotiationneeded'
        this.on('renegotiationneeded', (outgoingStream) => {

            log.debug('renegotiationneeded',  this.localSdp.getStreams())

            this.socket.emit('offer', {
                sdp: this.localSdp.toString(),
                room: this.room.dumps()
            })
        })


        this.emit('joined', {})

        this.socket.emit('joined', {
            sdp: this.localSdp.toString(),
            room: this.room.dumps()
        })

        this.socket.to(this.roomId).emit('peerConnected', {
            peer: this.dumps()
        })

    }

    private async handleAddStream(data: any) {

        const sdp = SDPInfo.process(data.sdp)

        const streamId = data.stream.msid
        const bitrate = data.stream.bitrate
        const attributes = data.stream.attributes 

        this.room.setBitrate(streamId, bitrate)
        this.room.setAttribute(streamId, attributes)

        const stream = sdp.getStreams().get(streamId)

        if (!stream) {
            return
        }

        if (this.incomingStreams.get(streamId)) {
            return
        }

        this.addStream(stream)

        for (const trackInfo of stream.getTracks().values()) {
            console.log(trackInfo.plain())
        }

        // we set bitrate  
        for(let media of this.localSdp.getMediasByType('video')){
            media.setBitrate(bitrate)
        }

        // check planb and Unified plan 
        this.socket.emit('answer', {
            sdp: this.localSdp.toString(),
            room: this.room.dumps()
        })


        this.socket.emit('streamAdded', {
            msid: stream.getId()
        })

    }

    private async handleRemoveStream(data: any) {
        
        const sdp = SDPInfo.process(data.sdp)
        const streamId = data.stream.msid


        if (!this.incomingStreams.get(streamId)) {
            return
        }
        const stream = this.incomingStreams.get(streamId)

        this.removeStream(stream)

        this.socket.emit('answer', {
            sdp: this.localSdp.toString(),
            room: this.room.dumps()
        })

    }

    private async handleConfigure(data: any) {


        const streamId = data.msid

        // this is a local stream 
        if (this.incomingStreams.get(streamId)) {
            this.socket.to(this.roomId).emit('configure', data)
            return
        }

        if (!this.outgoingStreams.get(streamId)) {
            return
        }

        // this is a remote stream 
        const outgoingStream = this.outgoingStreams.get(streamId)

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

    }

}


export default Peer
