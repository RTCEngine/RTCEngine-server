import {getManager, getConnection ,getRepository, MoreThan, Like, LessThan,Between, In, IsNull} from 'typeorm'

import { Stream } from './models'


const getPublisher = async (room:string, publisherId:string) => {

    const stream = await getRepository(Stream).findOne({
        where: {
            room: room,
            streamId: publisherId,
            origin: true
        }
    })
    return stream
}

const addPublisher = async (node:string ,room:string, publisherId:string, data:any) => {
    const stream = new Stream()
    stream.room = room
    stream.streamId = publisherId
    stream.data = data
    stream.node = node
    stream.origin = true

    await stream.save()
}

const removePublisher = async (room:string, publisherId:string) => {
    
    const stream = await getRepository(Stream).findOne({
        where: {
            room: room,
            streamId: publisherId,
            origin:true
        }
    })

    if (stream) {
        await stream.remove()
    }

    await getConnection()
    .createQueryBuilder()
    .delete()
    .from(Stream)
    .where("room = :room", { room: room })
    .andWhere("streamId = :publisherId", { publisherId:publisherId})
    .execute()

}

const getRoomPublishers = async (room:string) => {

    const streams = await getRepository(Stream).find({
        where: {
            room: room,
            attachId: IsNull(),
            origin:true
        }
    })

    return streams
}


const getNodeStreamRelay = async (node:string, room:string, publisherId:string) => {

    const stream = await getRepository(Stream).findOne({
        where: {
            node:node,
            room: room,
            streamId: publisherId,
            origin: false,
            attachId: IsNull()
        }
    })

    return stream
}

const getStreamAllRelays = async (room:string, publisherId:string) => {

    const streams = await getRepository(Stream).find({
        where: {
            room: room,
            streamId: publisherId,
            origin: false,
            attachId: IsNull()
        }
    })

    return streams
}


const addNodeStreamRelay = async (node:string,room:string, publisherId:string) => {

    const stream = new Stream()
    stream.room = room
    stream.streamId = publisherId
    stream.node = node
    stream.origin = false

    await stream.save()
}

const addSubscriber = async (node:string,room:string, publisherId:string, subscriberId:string, data?:any) => {

    const stream = new Stream()
    stream.room = room
    stream.streamId = publisherId
    stream.subscriberId = subscriberId
    stream.data = data
    stream.node = node
    await stream.save()
}


const getSubscriber = async (room:string,publisherId:string, subscriberId:string) => {

    const stream = await getRepository(Stream).findOne({
        where: {
            room: room,
            streamId: publisherId,
            subscriberId: subscriberId
        }
    })
    return stream
}


const removeSubscriber = async (node:string, room:string, publisherId:string, subscriberId:string) => {

    const stream = await getRepository(Stream).findOne({
        where: {
            node:node,
            room: room,
            streamId: publisherId,
            subscriberId: subscriberId
        }
    })

    if (stream) {
        await stream.remove()
    }
}


const removeAll = async (room:string) => {

    await getConnection()
    .createQueryBuilder()
    .delete()
    .from(Stream)
    .where("room = :room", { room: room })
    .execute()
}


export default {
    getPublisher,
    addPublisher,
    removePublisher,
    addSubscriber,
    getSubscriber,
    removeSubscriber,
    getRoomPublishers,
    getNodeStreamRelay,
    getStreamAllRelays,
    addNodeStreamRelay,
    removeAll,
}