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




const getOriginPublisher = async (room:string ,streamId:string) => {

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




export default {
    getOriginPublisher,
    getRoomPublishers,
}