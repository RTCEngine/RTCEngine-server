import { EventEmitter } from 'events'

const MediaServer = require('medooze-media-server')

import Peer from './peer'
import config from './config'
import Logger from './logger'
import Server from './server';

const log = new Logger('room')

export default class Room extends EventEmitter {

    private roomId: string
    private closed: boolean
    private peers: Map<string, Peer>
    private attributes: Map<string, any>
    private bitrates: Map<string, any>
    private tracks: Map<string, string>
    private endpoint: any
    private server:Server
    private activeSpeakerDetector: any

    constructor(room: string,server:Server, endpoint?:any) {

        super()
        this.setMaxListeners(Infinity)

        this.roomId = room
        this.closed = false
        this.peers = new Map()
        this.attributes = new Map()
        this.bitrates = new Map()
        this.tracks = new Map()
        this.server = server
        this.endpoint = MediaServer.createEndpoint(config.media.endpoint)

        this.activeSpeakerDetector = MediaServer.createActiveSpeakerDetector()

        this.activeSpeakerDetector.setMinChangePeriod(100)

        this.activeSpeakerDetector.on('activespeakerchanged', (track) => {

            let peerId = this.tracks.get(track.getId())

            if (peerId) {
                this.emit('activespeakerchanged', peerId)
                // just log for now 
                log.debug('activespeakerchanged', peerId)
            }

        })

    }

    public getId(): string {
        return this.roomId
    }

    public getEndpoint(): any {
        return this.endpoint
    }

    public getPeers(): Peer[] {
        return Array.from(this.peers.values())
    }

    public hasPeer(peer: string): boolean {
        return this.peers.has(peer)
    }

    public getPeer(peer: string): Peer {
        return this.peers.get(peer)
    }

    public newPeer(peerId:string): Peer {

        const peer = new Peer(peerId, this, this.server)

        this.peers.set(peer.getId(), peer)

        peer.on('incomingtrack', (track,stream) => {
            
        })

        peer.once('close', () => {

            this.peers.delete(peer.getId())
            this.emit('peers', this.peers.values())
            if (this.peers.size == 0) {
                log.debug('last peer in the room left, closeing the room ', this.roomId)
                this.close()
            }
        })

        this.emit('peers', this.peers.values())

        return peer
    }

    public close() {
        if (this.closed) {
            return
        }

        this.closed = true

        for (let peer of this.peers.values()) {
            peer.close()
        }

        if (this.activeSpeakerDetector) {
            this.activeSpeakerDetector.stop()
        }

        if (this.endpoint) {
            this.endpoint.stop()
        }

        this.emit('close')
    }


    public getIncomingStream(streamId:string): any {
        return this.getIncomingStreams().get(streamId)
    }

    public getIncomingStreams() {
        const streams = new Map()
        for (let peer of this.peers.values()) {
            for (let stream of peer.getIncomingStreams().values()) {
                streams.set(stream.getId(), stream)
            }
        }
        return streams
    }

    public getAttribute(streamId: string): any {
        return this.attributes.get(streamId)
    }

    public setAttribute(streamId: string, attibute: any) {
        this.attributes.set(streamId, attibute)
    }

    public getBitrate(streamId: string): any {
        return this.bitrates.get(streamId) || 0
    }

    public setBitrate(streamId: string, bitrate: any) {
        return this.bitrates.set(streamId, bitrate)
    }

    public getStreamData(streamId: string): any {
        return {
            streamId: streamId,
            attributes: this.getAttribute(streamId),
            bitrate: this.getBitrate(streamId)
        }
    }

    public dumps(): any {
        let info = {
            roomId: this.roomId,
            peers: []
        }
        for (let peer of this.peers.values()) {
            info.peers.push(peer.dumps())
        }
        return info
    }

}


