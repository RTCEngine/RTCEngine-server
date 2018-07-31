import { EventEmitter } from 'events'

import Peer from './peer'
import config from './config'
import Logger from './logger'

const CodecInfo = require('semantic-sdp').CodecInfo

const log = new Logger('room')

export default class Room extends EventEmitter {

    private roomid: string
    private closed: boolean
    private peers: Map<string, Peer>
    private attributes: Map<string,any>
    private bitrates: Map<string,any>

    constructor(roomid: string, endpoint: any) {

        super()
        this.setMaxListeners(Infinity)

        this.roomid = roomid
        this.closed = false
        this.peers = new Map()
        this.attributes = new Map()
        this.bitrates = new Map()     
    }

    public getId():string {
        return this.roomid
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

        if (this.peers.has(peer.userid)) {
            log.warn('peer alread in room')
            return
        }

        this.emit('add-peer', peer)

        this.peers.set(peer.userid, peer)

        peer.on('new-incoming-stream', (stream) => {

            for (let other of this.peers.values()) {
                if (peer.userid !== other.userid) {
                    other.addStream(stream)
                }
            }
        })

        peer.on('close', () => {

            this.peers.delete(peer.userid)

            this.emit('peers', this.peers.values())

            this.emit('remove-peer', peer)

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

        for (let peer of this.peers.values()) {
            peer.close()
        }

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

    public getAttribute(stream:string): any {
        return this.attributes.get(stream)
    }

    public setAttribute(stream:string, attibute:any) {
        this.attributes.set(stream, attibute)
    }

    public getBitrate(stream:string): any {
        return this.bitrates.get(stream)
    }

    public setBitrate(stream:string, bitrate: any) {
        return this.bitrates.set(stream, bitrate)
    }
    
    public dumps(): any {
        let info = {
            id: this.roomid,
            peers: []
        }
        for (let peer of this.peers.values()) {
            info.peers.push(peer.dumps())
        }
        return info
    }

}


