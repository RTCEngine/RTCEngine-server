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
    private peerId: string
    private roomId: string
    private closed: boolean = false
    // after Unified Plan is supported, we should set bitrate for every mediasource
    private bitrate: number = 0
    private room: Room

    private incomingTracks: Map<string,any> = new Map()
    private outgoingTracks: Map<string,any> = new Map()

    private server: Server
    private transport: any
    private sdpManager: any


    constructor(peerId: string, server: Server) {
        super()

        this.server = server
        this.peerId = peerId
    }

    public getId() {
        return this.peerId
    }

    public getLocalDescription() {
        return  this.sdpManager.createLocalDescription()
    }

    public getIncomingTracks(): Map<string,any> {
        return this.incomingTracks
    }

    public getOutgoingTracks(): Map<string,any> {
        return this.outgoingTracks
    }

    public init(data: any, room: Room) {

        this.room = room

        const endpoint = room.getEndpoint()

        this.sdpManager = endpoint.createSDPManager('unified-plan', config.media.capabilities)

        this.sdpManager.processRemoteDescription(data.sdp)

        this.transport = this.sdpManager.getTransport()

        this.transport.on('incomingtrack', (track, stream) => {

            log.debug('newtrack ==== ', track.getId())

            if (!this.incomingTracks.get(track.getId())) {
                this.incomingTracks.set(track.getId(), track)
            }

            track.stream = stream

            track.once('stopped', () => {
                this.incomingTracks.delete(track.getId())
            })

            this.emit('incomingtrack', track)
        })

        this.transport.on('outgoingtrack', (track, stream) => {

            log.debug('outgoingtrack =========', track.getId())

            if (!this.outgoingTracks.get(track.getId())) {
                this.outgoingTracks.set(track.getId(), track)
            }

            track.stream = stream

            track.once('stopped', () => {
                this.outgoingTracks.delete(track.getId())
            })

            this.emit('outgoingtrack', track)

        })

        this.sdpManager.on('renegotiationneeded', () => {

            log.debug('renegotiationneeded =============')
            this.emit('renegotiationneeded')
        })
    }

    public addOutgoingTrack(track, stream) {
        
        const outgoingStreamId = 'remote-' + stream.getId()

        let outgoingStream = this.transport.getOutgoingStream(outgoingStreamId)

        if (!outgoingStream) {
            outgoingStream = this.transport.createOutgoingStream(outgoingStreamId)
        }

        const outgoing = outgoingStream.createTrack(track.getMedia())

        outgoing.attachTo(track)

        track.once('stopped', () => {
            outgoing.stop()
        })

    }

    public close() {

        log.debug('peer close')

        if (this.closed) {
            return
        }

        this.closed = true

        for (let track of this.incomingTracks.values()) {
            track.stop()
        }

        for (let track of this.outgoingTracks.values()) {
            track.stop()
        }

        if (this.transport) {
            this.transport.stop()
        }

        this.incomingTracks.clear()
        this.outgoingTracks.clear()

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

        const incomingTracks = Array.from(this.incomingTracks.values())

        const tracks = incomingTracks.map((track) => {
            return {
                streamId: track.stream.id,
                trackId: track.getId(),
                bitrate: this.room.getBitrate(track.getId()),
                attributes: this.room.getAttribute(track.getId())
            }
        })
        
        const info = {
            peerId: this.peerId,
            tracks: tracks
        }

        return info
    }

}


export default Peer
