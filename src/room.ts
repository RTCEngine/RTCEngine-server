import { EventEmitter } from 'events'

const MediaServer = require('medooze-media-server')

import Peer from './peer'
import config from './config'
import Logger from './logger'

const log = new Logger('room')

export default class Room extends EventEmitter {

    private roomId: string
    private closed: boolean
    private peers: Map<string, Peer>
    private attributes: Map<string, any>
    private bitrates: Map<string, any>
    private tracksMap: Map<string, string>
    private endpoint: any
    private activeSpeakerDetector: any

    constructor(room: string) {

        super()
        this.setMaxListeners(Infinity)

        this.roomId = room
        this.closed = false
        this.peers = new Map()
        this.attributes = new Map()
        this.bitrates = new Map()
        this.tracksMap = new Map()

        this.endpoint = MediaServer.createEndpoint(config.media.endpoint)

        this.activeSpeakerDetector = MediaServer.createActiveSpeakerDetector()

        this.activeSpeakerDetector.setMinChangePeriod(100)

        this.activeSpeakerDetector.on('activespeakerchanged', (track) => {

            let peerId = this.tracksMap.get(track.getId())

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

    public addPeer(peer: Peer) {

        if (this.peers.has(peer.getId())) {
            log.warn('peer alread in room')
            return
        }

        this.peers.set(peer.getId(), peer)

        peer.on('stream', (stream) => {

            for (let other of this.peers.values()) {
                if (peer.getId() !== other.getId()) {
                    other.addOutgoingStream(stream)
                }
            }

            let audioTrack = stream.getAudioTracks()[0]

            if (audioTrack) {

                this.activeSpeakerDetector.addSpeaker(audioTrack)

                audioTrack.on('stoped', () => {
                    this.activeSpeakerDetector.removeSpeaker(audioTrack)
                })

            }

        })

        peer.on('close', () => {

            this.peers.delete(peer.getId())

            this.emit('peers', this.peers.values())

            if (this.peers.size == 0) {
                log.debug('last peer in the room left, closeing the room ', this.roomId)
                this.close()
            }
        })

        this.emit('peers', this.peers.values())
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

    public getIncomingStreams(): Map<string, any> {
        const streams = new Map()
        for (let peer of this.peers.values()) {
            for (let stream of peer.getIncomingStreams().values()) {
                streams.set(stream.getId(), stream)
            }
        }
        return streams
    }

    public getAttribute(stream: string): any {
        return this.attributes.get(stream)
    }

    public setAttribute(stream: string, attibute: any) {
        this.attributes.set(stream, attibute)
    }

    public getBitrate(stream: string): any {
        return this.bitrates.get(stream)
    }

    public setBitrate(stream: string, bitrate: any) {
        return this.bitrates.set(stream, bitrate)
    }

    public dumps(): any {
        let info = {
            id: this.roomId,
            peers: []
        }
        for (let peer of this.peers.values()) {
            info.peers.push(peer.dumps())
        }
        return info
    }

}


