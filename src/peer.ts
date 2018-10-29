import { EventEmitter } from 'events'

import Room from './room'
import Server from './server'
import config from './config'
import Logger from './logger'

const MediaServer = require('medooze-media-server')
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


const log = new Logger('peer')


class Peer extends EventEmitter {

    private usePlanB: boolean = true
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


    constructor(peerId: string, server: Server) {
        super()

        this.server = server
        this.userId = peerId

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

    public getIncomingStreams(): Map<string, any> {
        return this.incomingStreams
    }

    public getOutgoingStreams(): Map<string, any> {
        return this.outgoingStreams
    }

    public init(data: any, room: Room) {


        this.room = room

        const offer = SDPInfo.process(data.sdp)

        if ('planb' in data) {
            this.usePlanB = !!<boolean>data.planb
        }

        const endpoint = room.getEndpoint()

        this.transport = endpoint.createTransport(offer)

        this.transport.setRemoteProperties(offer)

        if (offer.getMedia('audio')) {
            offer.getMedia('audio').setDirection(Direction.SENDRECV)
        }

        if (offer.getMedia('video')) {
            offer.getMedia('video').setDirection(Direction.SENDRECV)
        }

        const answer = offer.answer({
            dtls: this.transport.getLocalDTLSInfo(),
            ice: this.transport.getLocalICEInfo(),
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

    public subIncomingStream(incomingStream: any, ) {

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

            if (exist) {
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

            if (exist) {
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
            refresh: config.recorder.refreshPeriod || 10000,
            waitForIntra: !!config.recorder.waitForIntra
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


    public dumps(): any {

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

}


export default Peer
