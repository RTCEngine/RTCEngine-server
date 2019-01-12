


import { EventEmitter } from 'events'
import * as request from './request'
 
class Router extends EventEmitter {

    private data:any
    private routerId: string
    private publisherId: string
    private subscribers: Map<string,string> = new Map() 


    public closed: boolean = false

    constructor(id:string, data?:any) {
        super()
        this.routerId = id
        this.data = data
    }

    public getId() {
        return this.routerId
    }

    public getPublisherId() {
        return this.publisherId
    }

    public getData() {
        return this.data
    }

    public getSubscribers() {
        return this.subscribers
    }

    public async createPublisher(streamId: string, sdp: string, data?:any) {

        const ret = await request.publish(streamId, sdp, data)
        this.publisherId = ret.streamId

        return { 
            publisherId: ret.streamId,
            answer: ret.sdp
        }
    }

    public async stopPublisher() {

        if (!this.publisherId) {
            return
        } 

        await this.close()
    }

    public async createSubscriber(sdp:string, data?:any) {

        const ret = await request.play(this.publisherId, sdp)
        this.subscribers.set(ret.outgoingId, ret.outgoingId)

        return { 
            subscriberId: ret.outgoingId,
            answer: ret.sdp
        }
    }

    public async stopSubscriber(subscriberId:string) {

        await request.unplay(this.publisherId, subscriberId)
        this.subscribers.delete(subscriberId)

        return
    }

    public async close() {

        if (this.closed) {
            return
        }
        this.closed = true

        if (this.publisherId) {
            await request.unpublish(this.publisherId)
        }

        // we can only unpublish incoming 
        // for (let outgoingId of this.outgoingStreams.keys()) {
        //     let incomingId = this.outgoingStreams.get(outgoingId)
        //     await request.unplay(incomingId, outgoingId)
        // }

        this.subscribers = null
        this.emit('close')
    }

    public dumps() {
        return {
            publisherId: this.publisherId,
            data: this.data
        }
    }
}

export default Router


