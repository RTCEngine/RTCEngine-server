import { EventEmitter } from 'events'
import * as WebSocket from 'ws'
import * as uuid from 'uuid'

import Message from './message'
import Room from './room'
import Application from './application'
import config from './config'
import * as redis from './redis'
import * as utils from './utils'
import Logger from './logger'


const MediaServer = require('medooze-media-server')
const SemanticSDP	= require("semantic-sdp")

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
    public socket: WebSocket
    public userid: string
    public roomid: string
    public closed: boolean = false
    // after Unified Plan is supported, we should set bitrate for every mediasource
    public bitrateMap: Map<string, number> = new Map() 
    public bitrate: number = 0
    public room?: Room

    public incomingStreams: Map<string, any> = new Map()
    public outgoingStreams: Map<string, any> = new Map()

    public localSDP?: any
    public remoteSDP?: any

    private application: Application

    private transport: any

    constructor(socket: WebSocket, application: Application) {
        super()
        this.setMaxListeners(Infinity)
        this.socket = socket
        this.userid = ''
        this.roomid = ''
        this.id = uuid.v4()

        this.application = application

        socket.on('message', async (data: WebSocket.Data) => {

            if (typeof data === 'string') {
                let msg = Message.parse(data)
                await this.onMessage(msg)
            } else {
                log.error('message does not support ', typeof data)
            }
        })

        socket.on('close', async (code: number, reason: string) => {

            this.room && this.room.broadcast({
                from: this.userid,
                type: 'peer_removed',
                data: {
                    peer: {
                        id: this.userid
                    }
                }
            }, [this.userid])

            this.close()
        })

        socket.on('error', async (event: { error: any, message: any, type: string, target: WebSocket }) => {
            log.error('socket error ', event.error)
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
            this.socket.close()
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

        this.room = undefined
        this.incomingStreams.clear()
        this.outgoingStreams.clear()
        this.transport = undefined
        this.localSDP = undefined
        this.remoteSDP = undefined

        
        this.emit('close')
    }

    public async send(msg: any) {
        try {
            this.socket.send(JSON.stringify(msg))
        } catch (error) {
            log.error('peer send error', error)
        }
    }

    public getIncomingStreams(): any {
        return this.incomingStreams.values()
    }

    public get incomingStreamids(): string[] {
        return Array.from(this.incomingStreams.keys())
    }

    // For outgoing stream 
    public addStream(stream: any) {

        log.error("addStream", stream)

        if (this.outgoingStreams.get(stream.getId())) {
            log.error("addStream: outstream already exist", stream.getId())
            return
        }

        const outgoingStream = this.transport.createOutgoingStream(stream.getStreamInfo())

        const info = outgoingStream.getStreamInfo()
        
        this.localSDP.addStream(info)

        this.outgoingStreams.set(outgoingStream.getId(), outgoingStream)

        this.emit('renegotiationneeded', this.localSDP)


        outgoingStream.attachTo(stream)

        log.error('outgoingStream added', outgoingStream.id)
        
        stream.on('stopped', () => {

            if (!this.outgoingStreams) {
                return
            }

            this.outgoingStreams.delete(outgoingStream.getId())

            // remove from sdp 
            this.localSDP.removeStream(info)

            this.emit('renegotiationneeded', this.localSDP)

            outgoingStream.stop()
        })
    }

    // For outgoing stream  TODO
    public removeStream(stream: any) {}

    // publish stream 
    public publishStream(stream: any) {

        if (!this.transport) {
            throw Error("do not have transport")
        }

        const incomingStream = this.transport.createIncomingStream(stream)

        this.incomingStreams.set(incomingStream.id, incomingStream)

        this.emit('stream', incomingStream)

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

    }


    public getLocalSDP() {
        return this.localSDP
    }

    public getRemoteSDP() {
        return this.remoteSDP
    }

    public dumps():any {
        const info = {
            id: this.userid,
            msids: this.incomingStreamids
        }
        return info
    }

    private async onMessage(msg: any) {

        // log.debug('onMessage ', msg)

        if (msg.type === 'join') {
            await this.handleJoin(msg)
        } else if (msg.type === 'offer') {
            await this.handleOffer(msg)
        } else if (msg.type === 'answer') {
            await this.handleAnswer(msg)
        } else if (msg.type === 'configure') {
            await this.handleConfigure(msg)
        } else if (msg.type === 'attributes') {
            await this.handleAttributes(msg)
        } else if (msg.type === 'leave') {
            await this.handleLeave(msg)
        } else {
            log.error('onMessage type does not match')
        }
    }

    private async handleJoin(msg: any) {

        const room = <string>msg.data.room
        const user = <string>msg.data.user
        const offer = SDPInfo.process(msg.data.sdp)

        this.roomid = room
        this.userid = user

        if ('planb' in msg.data) {
            this.usePlanB = !!<boolean>msg.data.planb
        }

        this.room = this.application.getRoom(this.roomid)

        if (!this.room) {
            this.room = new Room(this.roomid, this.application.endpoint)
            this.application.addRoom(this.room)
        }

        this.room.addPeer(this)


        const endpoint = this.application.endpoint

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

        log.error('room get streams ', streams)

        for (let stream of streams) {
            this.addStream(stream)
        }

        for (let stream of offer.getStreams().values()) {
            this.publishStream(stream)
        }

        // After first  addStream, we should listen 'renegotiationneeded'
        this.on('renegotiationneeded', (sdp) => {

            this.send({
                type: 'offer',
                from: this.userid,
                data: {
                    sdp: sdp.toString(),
                    room: this.room.dumps()
                }
            })

            log.error('renegotiationneeded======================================', this.userid, sdp.toString())
        })

        
        this.send({
            type: 'joined',
            from: this.userid,
            target: this.userid,
            data: {
                sdp: this.getLocalSDP().toString(),
                room : this.room.dumps()
            }
        })

        // TODO, make this better 
        this.room.broadcast({
            type: 'peer_connected',
            from: this.userid,
            data: {
                peer: {
                    id: this.userid,
                    msids: this.incomingStreamids
                }
            }
        }, [this.userid])
    }


    private async handleOffer(msg: any) {

        const sdp = SDPInfo.process(msg.data.sdp)

        let oldStreamIds = new Set(this.incomingStreamids)

        // a bit ugly, TODO
        // find streams to add   
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
        
        // check bitrate 
        if (this.localSDP.getMediasByType('video')) {
            for(let media of this.localSDP.getMediasByType('video')){
                media.setBitrate(this.bitrate)
            }
        }


        this.send({
            type: 'answer',
            from: this.userid,
            target: this.userid,
            data: {
                sdp: this.getLocalSDP().toString(),
                room: this.room.dumps()
            }
        })

        
        for (let stream of sdp.getStreams().values()) {
            if (!oldStreamIds.has(stream.getId())) {
                // new stream 
                this.send({
                    type: 'streamAdded',
                    from: this.userid,
                    data: {
                        msid: stream.getId()
                    }
                })
            }
        }

    }

    private async handleAnswer(msg: any) {

        const sdp = SDPInfo.process(msg.data.sdp)

        // find streams to add
        for (let stream of sdp.getStreams().values()) {
            if (!this.incomingStreams.get(stream.getId())) {
                log.error('answer should not addStream ================', stream.getId())
                //this.publishStream(stream)
            }
        }

        // // find streams to remove 
        // for (let stream of this.incomingStreams.values()) {
        //     if (!sdp.getStreams().get(stream.getId())) {
        //         this.unpublishStream(stream)
        //     }
        // }
    }

    private async handleConfigure(msg: any) {
        // bitrate 
        if ('bitrate' in msg.data) {
            let videoMsid = msg.data.msid
            let bitrate = <number>msg.data.bitrate
            this.bitrateMap.set(videoMsid, bitrate)
            this.bitrate = bitrate
            return
        }

        if ('local' in msg.data) {
            this.room && this.room.broadcast({
                type: 'configure',
                from: this.userid,
                data: msg.data
            })
            return
        }

        // we only mute video for now 
        if ('remote' in msg.data && 'video' in msg.data) {
            let videoMsid = msg.data.msid
            let disable = !msg.data.video

            let outgoingStream = this.outgoingStreams.get(videoMsid)

            if (!outgoingStream){
                return
            }

            for (let track of outgoingStream.getVideoTracks()) {
                track.mute(disable)
            }

        }
    }


    private async handleAttributes(msg: any) {
        let msid = msg.data.msid
        let attributes = msg.data.attributes

        if (!msid) {
            return;
        }

        await redis.setStreamAttributes(msid, attributes)

        // todo  

        this.room && this.room.broadcast({
            type: 'attributes',
            from: this.userid,
            data: {
                msid: msid,
                attributes: attributes
            }
        }, [this.userid])

    }

    private async handleLeave(msg: any) {

    }

    

}


export default Peer
