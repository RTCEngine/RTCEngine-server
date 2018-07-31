import { EventEmitter } from 'events'
import * as uuid from 'uuid'

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

    public id: string
    public usePlanB: boolean = true
    public socket: SocketIO.Socket
    public userid: string
    public roomid: string
    public closed: boolean = false
    // after Unified Plan is supported, we should set bitrate for every mediasource
    public bitrate: number = 0
    public room?: Room

    public incomingStreams: Map<string, any> = new Map()
    public outgoingStreams: Map<string, any> = new Map()

    public localSDP?: any
    public remoteSDP?: any

    private server: Server
    private transport: any



    constructor(socket: SocketIO.Socket, server: Server) {
        super()

        this.server = server
        this.socket = socket
        this.userid = ''
        this.roomid = ''
        this.id = uuid.v4()


        socket.on('join', async (data:any, callback?:Function) => {
            await this.handleJoin(data)
        })

        socket.on('offer', async (data:any, callback?:Function) => {
            await this.handleOffer(data)
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
            socket.to(this.roomid).emit('message', data)
        })

        socket.on('disconnect', async () => {
            socket.to(this.roomid).emit('peerRemoved', {
                peer: this.dumps()
            })
            this.close()
        })

    
    }

    public close() {

        log.debug('peer close')

        if (this.closed) {
            return
        }

        this.closed = true

        if (this.socket) {
            this.socket.disconnect()
        }

        if (this.socket) {
            this.socket.leaveAll()
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

    public async send(msg: any) {
        try {
            this.socket.send(JSON.stringify(msg))
        } catch (error) {
            log.debug('peer send error', error)
        }
    }

    public getIncomingStreams(): any {
        return this.incomingStreams.values()
    }

    public get incomingStreamids(): string[] {
        return Array.from(this.incomingStreams.keys())
    }

    // For outgoing stream 
    public addOutgoingStream(stream: any) {

        if (this.outgoingStreams.get(stream.getId())) {
            log.error("addStream: outstream already exist", stream.getId())
            return
        }

        const outgoingStream = this.transport.createOutgoingStream(stream.getStreamInfo())

        const info = outgoingStream.getStreamInfo()
        
        this.localSDP.addStream(info)

        this.outgoingStreams.set(outgoingStream.getId(), outgoingStream)

        outgoingStream.attachTo(stream)
        
        stream.on('stopped', () => {

            if (!this.outgoingStreams) {
                return
            }

            this.outgoingStreams.delete(outgoingStream.getId())

            if (this.localSDP) {
                this.localSDP.removeStream(info)
            }
            
            outgoingStream.stop()

            this.emit('renegotiationneeded', outgoingStream)
            this.emit('remove-outgoing-stream', outgoingStream)

        })

        this.emit('renegotiationneeded', outgoingStream)
        this.emit('new-outgoing-stream', outgoingStream)
    }

    // publish stream 
    public publishStream(stream: any) {

        if (!this.transport) {
            throw Error("do not have transport")
        }

        const incomingStream = this.transport.createIncomingStream(stream)

        this.incomingStreams.set(incomingStream.id, incomingStream)

        this.emit('new-incoming-stream', incomingStream)

    }

    // unpublish stream
    public unpublishStream(stream: any) {

        if (!this.transport) {
            throw Error("do not have transport")
        }

        let incomingStream = this.incomingStreams.get(stream.getId())

        if (incomingStream) {
            incomingStream.stop()
        }
        // delete from incomingStreams
        this.incomingStreams.delete(stream.getId())

        this.emit('remove-incoming-stream', incomingStream)

    }


    public getLocalSDP() {
        return this.localSDP
    }

    public getRemoteSDP() {
        return this.remoteSDP
    }

    public dumps():any {
        /*
        streams: [
            {
                id: string,
                bitrate:int,
                attributes:any
                }
            }
        ]
        */
        const streams = this.incomingStreamids.map((streamId) => {
            return {
                id: streamId,
                bitrate: this.room.getBitrate(streamId),
                attributes: this.room.getAttribute(streamId)
            }
        })

        const info = {
            id: this.userid,
            streams: streams
        }

        return info
    }

    private async handleJoin(data: any) {

        const room = <string>data.room
        const user = <string>data.user
        const offer = SDPInfo.process(data.sdp)

        this.roomid = room
        this.userid = user

        if ('planb' in data) {
            this.usePlanB = !!<boolean>data.planb
        }

        this.room = this.server.getRoom(this.roomid)

        if (!this.room) {
            this.room = new Room(this.roomid, this.server.endpoint)
            this.server.addRoom(this.room, this)
        }

        this.room.addPeer(this)

        this.socket.join(this.roomid)

        const endpoint = this.server.endpoint

        // ice and dtls
        this.transport = endpoint.createTransport(offer)

        this.transport.on('targetbitrate', (bitrate:number) => {

            log.debug('transport:bitrate', bitrate)
        })

        // audio and video
        this.transport.setRemoteProperties(offer)

        const dtls = this.transport.getLocalDTLSInfo()
        const ice = this.transport.getLocalICEInfo()
        const candidates = endpoint.getLocalCandidates()

        const answer = new SDPInfo()

        answer.setDTLS(dtls)
        answer.setICE(ice)
        answer.addCandidates(candidates)


        const audioOffer = offer.getMedia('audio')

        if (audioOffer) {
            audioOffer.setDirection(Direction.SENDRECV)
            const audio = audioOffer.answer(config.media.capabilities.audio)
            answer.addMedia(audio)
        }

        const videoOffer = offer.getMedia('video')

        if (videoOffer) {
            videoOffer.setDirection(Direction.SENDRECV)
            const video = videoOffer.answer(config.media.capabilities.video)
            if(video.getBitrate() == 0){
                log.error("client does not set bitrate")
                video.setBitrate(500) // if client does not set bitrate, we should set that in server side 
                this.bitrate = video.getBitrate()
            }
            answer.addMedia(video)
        }

        this.transport.setLocalProperties({
            audio: answer.getMedia('audio'),
            video: answer.getMedia('video')
        })

        this.localSDP = answer
        this.remoteSDP = offer

        const streams = this.room.getStreams()

        for (let stream of streams) {
            this.addOutgoingStream(stream)
        }

        // just in case 
        for (let stream of offer.getStreams().values()) {
            this.publishStream(stream)
        }

        // After first  addStream, we should listen 'renegotiationneeded'
        this.on('renegotiationneeded', (outgoingStream) => {

            let attributes = this.room.getAttribute(outgoingStream.getId())


            this.socket.emit('offer', {
                sdp: this.localSDP.toString(),
                room: this.room.dumps()
            })
        })


        this.emit('joined', {})

        this.socket.emit('joined', {
            sdp: this.localSDP.toString(),
            room: this.room.dumps()
        })

        this.socket.to(this.roomid).emit('peerConnected', {
            peer: this.dumps()
        })

    }


    private async handleOffer(data: any) {

        const sdp = SDPInfo.process(data.sdp)

        let oldStreamIds = new Set(this.incomingStreamids)

        for (let stream of sdp.getStreams().values()) {
            if (!this.incomingStreams.get(stream.getId())) {
                this.publishStream(stream)
            }
        }

        // find streams to remove
        for (let stream of this.incomingStreams.values()) {
            if (!sdp.getStreams().get(stream.getId())) {
                this.unpublishStream(stream)
            }
        }


        // check bitrate, fix this after we all support Unified plan
        if (this.localSDP.getMediasByType('video')) {
            for(let media of this.localSDP.getMediasByType('video')){
                media.setBitrate(this.bitrate)
            }
        }

        this.socket.emit('answer', {
            sdp: this.localSDP.toString(),
            room: this.room.dumps()
        })


        for (let stream of sdp.getStreams().values()) {
            if (!oldStreamIds.has(stream.getId())) {
                // new stream 
                this.socket.emit('streamAdded', {
                    msid: stream.getId()
                })
            }
        }
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

        this.publishStream(stream)

        // we set bitrate  
        for(let media of this.localSDP.getMediasByType('video')){
            if (media.getId() === streamId) {
                log.debug('setBitrate ===============')
                media.setBitrate(bitrate)
            }
        }

        // check planb and Unified plan 
        this.socket.emit('answer', {
            sdp: this.localSDP.toString(),
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

        this.unpublishStream(stream)

        this.socket.emit('answer', {
            sdp: this.localSDP.toString(),
            room: this.room.dumps()
        })

    }

    private async handleConfigure(data: any) {

        if ('local' in data) {
            this.socket.to(this.roomid).emit('configure', data)
            return
        }

        // we only mute video for now 
        if ('remote' in data && 'video' in data) {
            let videoMsid = data.msid
            let disable = !data.video

            let outgoingStream = this.outgoingStreams.get(videoMsid)

            if (!outgoingStream){
                return
            }

            for (let track of outgoingStream.getVideoTracks()) {
                track.mute(disable)
            }

        }
    }

}


export default Peer
