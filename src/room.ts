import { EventEmitter } from 'events'

import * as uuid from 'uuid'

import Peer from  './peer'
import config from './config'
import Logger from './logger'
import Server from './server'
import Router from './router'


const log = new Logger('room')

export default class Room extends EventEmitter {

    private roomId: string
    private closed: boolean

    private peers: Map<string, Peer>
    private routers: Map<string, Router>

    private server:Server

    constructor(room: string,server:Server) {

        super()
        this.setMaxListeners(Infinity)

        this.roomId = room

        this.closed = false

        this.routers = new Map()

        this.server = server

    }

    public getId(): string {
        return this.roomId
    }


    public getRouters(): Router[] {
        return Array.from(this.routers.values())
    }

    public newRouter() {

        const id = uuid.v4()
        const router = new Router(id)
        this.routers.set(id, router)

        router.once('close', () => {
            this.routers.delete(router.getId())
            if(this.routers.size == 0) {
                this.close()
            }
        })

        this.emit('newrouter',router)

        return router
    }

    public hasPublisher(streamId:string)  {
        return this.getPublishers().get(streamId)
    }

    public getRouterByPublisher(streamId:string): Router {
        for (let router of this.routers.values()){
            if (router.getPublisherId() === streamId) {
                return router
            }
        }
        return null
    }

    public getPublishers(): Map<string,any> {
        let streams = new Map()
        for (let router of this.routers.values()) {
            if (router.getPublisherId()) {
                streams.set(router.getPublisherId(),router.getData())
            }
        }
        return streams
    }


    public close() {
        if (this.closed) {
            return
        }

        this.closed = true

        for (let peer of this.peers.values()) {
            peer.close()
        }

        for (let router of this.routers.values()) {
            router.close()
        }

        this.emit('close')
    }


    public dumps(): any {
        let info = {
            roomId: this.roomId,
            streams: []
        }
        
        for (let router of this.routers.values()) {
            if (!router.closed && router.getPublisherId()) {
                info.streams.push(router.dumps())
            }
        }
        return info
    }

}


