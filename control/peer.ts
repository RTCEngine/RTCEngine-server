import { EventEmitter } from 'events'

import Room from './room'
import Server from './server'
import config from './config'
import Logger from './logger'

import * as request from './request'

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
    
    private room: Room

    private server: Server

    private incomingStreams: Map<string, any> = new Map()
    private outgoingStreams: Map<string, any> = new Map()

    public closed: boolean = false

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

    public async addIncoming(sdp: string, streamId:string, data?: any) {

        const ret = await request.publish(streamId, sdp)
        this.incomingStreams.set(streamId, ret.streamId)

        return { 
            streamId: ret.streamId,
            answer: ret.sdp
        }
    }

    public async removeIncoming(streamId:string) {

        const incoming = this.incomingStreams.get(streamId)
        if (!incoming){
            return
        }

        await request.unpublish(streamId)
        this.incomingStreams.delete(streamId)

        return
    }
    
    public async addOutgoing(sdp: string, streamId:string, data?: any) {

        const ret = await request.play(streamId, sdp)
        this.outgoingStreams.set(ret.outgoingId, streamId)

        return { 
            streamId: ret.outgoingId,
            answer: ret.sdp
        }
    }

    public async removeOutgoing(outgoingId:string) {

        const incomingStreamId = this.outgoingStreams.get(outgoingId)
        if (!incomingStreamId){
            return
        }

        await request.unplay(incomingStreamId, outgoingId)

        this.outgoingStreams.delete(outgoingId)
        return
    }

    public async close() {

        log.debug('peer close')

        if (this.closed) {
            return
        }

        this.closed = true

        for (let stream of this.incomingStreams.keys()) {
            await request.unpublish(stream)
        }

        // we can only unpublish incoming 

        // for (let outgoingId of this.outgoingStreams.keys()) {
        //     let incomingId = this.outgoingStreams.get(outgoingId)
        //     await request.unplay(incomingId, outgoingId)
        // }

        this.incomingStreams.clear()
        this.outgoingStreams.clear()

        this.emit('close')
    }

    public dumps(): any {
        
        const incomingStreams = Array.from(this.getIncomingStreams().values())
        const streams = incomingStreams.map((stream) => {
            return {
                streamId:stream,
                bitrate: this.room.getBitrate(stream),
                attributes: this.room.getAttribute(stream)
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
