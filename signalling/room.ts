import { EventEmitter } from 'events'


import config from './config'
import logger from './logger'
import request from './request'
import manager from './manager'



export default class Room extends EventEmitter {

    private roomId: string
    private closed: boolean


    constructor(room: string) {

        super()
        this.roomId = room
        this.closed = false
    }

    public getId(): string {
        return this.roomId
    }

    public async getPublisher(streamId:string) {
        return await manager.getPublisher(this.roomId,streamId)
    }
    
    public async getSubscriber(streamId:string, subscriberId:string) {
        return await manager.getSubscriber(this.roomId, streamId, subscriberId)
    }

    public async getPublishers() {
        return await manager.getRoomPublishers(this.roomId)
    }

    public async getNodeStreamRelay(node:string,streamId:string) {
        return await manager.getNodeStreamRelay(node,this.roomId,streamId)
    }

    public async createPublisher(node:string,streamId:string,offer:string, data?:any) {

        // todo error handle 
        const ret = await request.publish(node, streamId, offer, data)

        const publisherId = ret.data.streamId
        const sdp = ret.data.sdp 

        await manager.addPublisher(node, this.roomId,streamId,data)

        return {
            answer: sdp,
            publisherId: publisherId
        }
    }


    public async stopPublisher(node:string, streamId:string) {

        await request.unpublish(node, streamId)
        // todo 
        // stop edge relays
        // stop subscribers
        await manager.removePublisher(this.roomId,streamId)
    }



    public async createSubscriber(origin:string,node:string, publisherId:string, offer:string) {

        const ret = await request.play(origin,node, publisherId, offer)

        if (ret.data.newRelay) {
            await manager.addNodeStreamRelay(node, this.roomId, publisherId)
        }

        await manager.addSubscriber(node, this.roomId, publisherId, ret.data.outgoingId)

        return { 
            subscriberId: ret.data.outgoingId,
            answer: ret.data.sdp
        }
    }


    public async stopSubscriber(node:string,publisherId:string, subscriberId:string) {
        
        await request.unplay(node,publisherId, subscriberId)
        await manager.removeSubscriber(node,this.roomId, publisherId, subscriberId)
    }

    public async shutdown() {
        await manager.removeAll(this.roomId)
    }
    
    public async dumps() {

        let info = {
            roomId: this.roomId,
            streams: []
        }

        let streams = await manager.getRoomPublishers(this.roomId)

        for (let stream of streams) {
            info.streams.push({
                publisherId: stream.streamId,
                data: stream.data
            })
        }
        return info
    }

}


