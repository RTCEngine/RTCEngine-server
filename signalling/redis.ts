const format = require('string-format')


import * as Redis from 'ioredis'
import config from './config'



const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port
})



// type: hash
// key:streamId  value: attach data
const ROOM_PUBLISHERS = 'room:{room}:publishers'      // hash 


// type: hash
// key: subscriberId  value: attached streamId 
const ROOM_SUBSCRIBERS = 'room:{room}:subscribers'    // hash 



// type: hash
// key: streamId  value:  {type:origin or edge}
const NODE_ROOM_PUBLISHERS = 'node:{node}:room:{room}:publishers' // key value  


// type: hash
// key: subscriberId  value: attached streamId 
const NODE_ROOM_SUBSCRIBERS = 'node:{node}:room:{room}:subscribers'  


// type: hash
// key: node  value: origin or edge 
const PUBLISHER_ONE = 'room:{room}:publisher:{streamId}'



// type: hash
// key1: node  value1:node value
// key2: streamId value2: streamId value 
const SUBSCRIBER_ONE = 'room:{room}:subsriber:{subscriberId}'  





const getOriginPublisher = async (room:string ,streamId:string) => {

    let key = format(PUBLISHER_ONE, {room:room, streamId:streamId})
    return await redis.hgetall(key)
} 


const getRoomPublishers = async (room:string) => {

    let key = format(ROOM_PUBLISHERS, {room:room})
    let ret:{[key:string]:string} = await redis.hgetall(key)

    const publishers:{[key:string]:any} = {}

    for (let key of Object.keys(ret)) {
        if (ret[key]) {
            publishers[key] = JSON.parse(ret[key])
        }
    }
    return publishers
}


const addOriginPublisher = async (node:string, room:string, streamId:string, data?:any) => {

    // publisher one 
    let publisherKey = format(PUBLISHER_ONE, {room:room, streamId: streamId})
    await redis.hset(publisherKey, streamId,'origin')


    // add to room 
    let roomPublishersKey = format(ROOM_PUBLISHERS, {room:room})
    await redis.hset(roomPublishersKey, streamId, JSON.stringify(data || {}))

    // add to node's room
    let nodeRoomPublishersKey = format(NODE_ROOM_PUBLISHERS, {node:node, room:room})
    await redis.hset(nodeRoomPublishersKey, streamId, JSON.stringify({
        type: 'origin'
    }))
}


const addEdgePublisher = async (node:string, room:string, streamId:string, data?:any) => {

    // publisher one 
    let publisherKey = format(PUBLISHER_ONE, {room:room, streamId: streamId})
    await redis.hset(publisherKey, streamId,'edge')

        
    // add to room 
    let roomPublishersKey = format(ROOM_PUBLISHERS, {room:room})
    await redis.hset(roomPublishersKey, streamId, JSON.stringify(data || {}))

    // add to node's room
    let nodeRoomPublishersKey = format(NODE_ROOM_PUBLISHERS, {node:node, room:room})
    await redis.hset(nodeRoomPublishersKey, streamId, JSON.stringify({
        type: 'edge'
    }))
}



// should remove all origin and edge 
const removePublisher = async (room:string, streamId:string) => {

    
    
}





export default {
    getOriginPublisher,
    getRoomPublishers,
    addOriginPublisher,
    addEdgePublisher
}