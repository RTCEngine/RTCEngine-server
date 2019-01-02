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

    private usePlanB: boolean = true
    private peerId: string
    private roomId: string
    private closed: boolean = false
    // after Unified Plan is supported, we should set bitrate for every mediasource
    private bitrate: number = 0
    private room: Room

    private server: Server
    private transport: any
    private sdpManager: any


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

    /**
     * @returns {string}
     * @memberof Peer
     */
    public createLocalDescription():string {
        return  this.sdpManager.createLocalDescription()
    }

    public getTransport() {
        return this.transport
    }


    public getIncomingStream(streamId: string) {

        if (this.transport) {
            return this.transport.getIncomingStream(streamId)
        }
        return null
    }

    public getIncomingStreams() {

        if (this.transport) {
            return this.transport.getIncomingStreams()
        }
        return []
    }

    public getOutgoingStream(streamId: string) {

        if (this.transport) {
            return this.transport.getOutgoingStream(streamId)
        }
        return null
    }

    public getOutgoingStreams() {
        
        if (this.transport) {
            return this.transport.getOutgoingStreams()
        }
        return []
    }

    public init(data: any) {

        const endpoint = this.room.getEndpoint()

        this.sdpManager = endpoint.createSDPManager('unified-plan', config.media.capabilities)

        this.sdpManager.processRemoteDescription(data.sdp)

        this.transport = this.sdpManager.getTransport()

        this.transport.on('incomingtrack', (track, stream) => {

            track.stream = stream
            this.emit('incomingtrack', track, stream)
        })


        this.transport.on('outgoingtrack', (track, stream) => {
            track.stream = stream
        })

        this.sdpManager.on('renegotiationneeded', () => {
            this.emit('renegotiationneeded')
        })
    }

    public close() {

        log.debug('peer close')

        if (this.closed) {
            return
        }

        this.closed = true

        if (this.transport) {
            this.transport.stop()
        }

        this.emit('close')
    }

    public processRemoteDescription(sdp:string) {

        try {
            this.sdpManager.processRemoteDescription(sdp)
            // do we need send this back 
        } catch (error) {
            log.error(error)
        }
    }

    public dumps(): any {

        const incomingStreams = this.getIncomingStreams()
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
