import { EventEmitter } from 'events'

import Peer from './peer'
import config from './config'
import Logger from './logger'

const CodecInfo = require('semantic-sdp').CodecInfo

const log = new Logger('room')

export default class Room extends EventEmitter {
    public roomid: string
    public closed: boolean
    public peers: Map<string, Peer>
    public capabilities: any

    constructor(room: string, endpoint: any) {

        super()
        this.setMaxListeners(Infinity)

        this.roomid = room
        this.closed = false
        this.peers = new Map()

        this.capabilities = {
            audio: {
                codecs: CodecInfo.MapFromNames(['opus']),
                extensions: new Set([
                    'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
                    'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01'
                ])
            },
            video: {
                codecs: CodecInfo.MapFromNames(['vp8', 'flexfec-03'], true),
                extensions: new Set([
                    'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
                    'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
                    "urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id",
                    "urn:ietf:params:rtp-hdrext:sdes:repair-rtp-stream-id",
                    "urn:ietf:params:rtp-hdrext:sdes:mid"
                ]),
                simulcast: true
            }
        }

    }

    public hasPeer(peer: string): boolean {
        return this.peers.has(peer)
    }

    public addPeer(peer: Peer) {
        if (this.peers.has(peer.userid)) {
            log.warn('peer alread in room')
            return
        }

        this.peers.set(peer.userid, peer)

        peer.on('stream', (stream) => {
            
            for (let other of this.peers.values()) {
                if (peer.userid != other.userid) {
                    other.addStream(stream)
                }
            }
        })

        peer.on('close', () => {

            this.peers.delete(peer.userid)

            this.emit('peers', this.peers.values())

            if (this.peers.size == 0) {
                log.debug('last peer in the room left, closeing the room ', this.roomid)
                this.close()
            }
        })

        this.emit('peers', this.peers.values())
    }
    public close() {
        if (this.closed) {
            return
        }

        log.debug('room close')

        this.closed = true

        this.emit('close')
    }

    public getStreams(): any[] {
        const streams: any[] = []

        for (let peer of this.peers.values()) {
            for (let stream of peer.getIncomingStreams()) {
                streams.push(stream)
            }
        }
        return streams
    }

    public dumps(): any {

        return {}
    }
    public async broadcast(msg: any, excluded?: string[]) {

        const extendsSet = new Set<string>()

        if (excluded) {
            for (const entry of excluded) {
                extendsSet.add(entry)
            }
        }

        for (let [key, peer] of this.peers) {

            if (extendsSet.has(peer.userid)) {
                continue
            }
            await peer.send(msg)
        }
    }
}


