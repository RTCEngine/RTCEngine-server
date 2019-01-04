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

/**
 *
 *
 * @class Peer
 * @extends {EventEmitter}
 */
class Peer extends EventEmitter {

    private peerId: string
    private roomId: string
    private closed: boolean = false
    private room: Room

    private server: Server

    private incomingStreams: Map<string, any> = new Map()
    private outgoingStreams: Map<string, any> = new Map()

    /**
     *Creates an instance of Peer.
     * @param {string} peerId
     * @param {Room} room
     * @param {Server} server
     * @memberof Peer
     */
    constructor(peerId: string, room: Room ,server: Server) {
        super()

        this.room = room
        this.server = server
        this.peerId = peerId
    }

    /**
     * @returns
     * @memberof Peer
     */
    public getId() {
        return this.peerId
    }

    public getIncomingStreams(): Map<string, any> {
        return this.incomingStreams
    }

    public getOutgoingStreams(): Map<string, any> {
        return this.outgoingStreams
    }

    public addIncoming(sdp: string, streamId:string, data?: any) {

        const offer = SDPInfo.process(sdp)
        const endpoint = this.room.getEndpoint()
        const transport = endpoint.createTransport(offer)

        const answer = offer.answer({
            dtls: transport.getLocalDTLSInfo(),
            ice: transport.getLocalICEInfo(),
            candidates: endpoint.getLocalCandidates(),
            capabilities: config.media.capabilities
        })

        transport.setLocalProperties(answer)
        const streamInfo = offer.getStream(streamId)
        const incoming = transport.createIncomingStream(streamInfo)
        incoming.transport = transport
        this.incomingStreams.set(incoming.getId(), incoming)

        // todo set bitrate
        return { 
            incoming: incoming,
            answer: answer.toString()
        }
    }

    public removeIncoming(streamId:string) {

        const incoming = this.incomingStreams.get(streamId)
        if (!incoming){
            return
        }

        if (incoming.transport) {
            incoming.transport.stop()
        }
        this.incomingStreams.delete(streamId)
        return
    }

    public addOutgoing(sdp: string, streamId:string, data?: any) {

        const offer = SDPInfo.process(sdp)
        const endpoint = this.room.getEndpoint()
        const transport = endpoint.createTransport(offer)

        const answer = offer.answer({
            dtls: transport.getLocalDTLSInfo(),
            ice: transport.getLocalICEInfo(),
            candidates: endpoint.getLocalCandidates(),
            capabilities: config.media.capabilities
        })

        const incoming = this.room.getIncomingStream(streamId)

        const outgoing = transport.createOutgoingStream(incoming.getStreamInfo())
        outgoing.attachTo(incoming)
        outgoing.transport = transport

        this.outgoingStreams.set(outgoing.getId(), outgoing)

        answer.addStream(outgoing.getStreamInfo())

        return { 
            outgoing: outgoing,
            answer: answer.toString()
        }
    }

    public removeOutgoing(streamId:string) {

        const outgoing = this.outgoingStreams.get(streamId)
        if (!outgoing){
            return
        }

        if (outgoing.transport) {
            outgoing.transport.stop()
        }
        this.outgoingStreams.delete(streamId)
        return
    }

    public close() {

        log.debug('peer close')

        if (this.closed) {
            return
        }

        this.closed = true


        for (let stream of this.incomingStreams.values()) {
            stream.transport.stop()
        }

        for (let stream of this.outgoingStreams.values()) {
            stream.transport.stop()
        }

        this.incomingStreams.clear()
        this.outgoingStreams.clear()

        this.emit('close')
    }

    public dumps(): any {
        
        const incomingStreams = Array.from(this.getIncomingStreams().values())
        const streams = incomingStreams.map((stream) => {
            return {
                streamId:stream.getId(),
                bitrate: this.room.getBitrate(stream.getId()),
                attributes: this.room.getAttribute(stream.getId())
            }
        })

        const info = {
            peerId: this.peerId,
            streams: streams
        }

        return info
    }

}


export default Peer
