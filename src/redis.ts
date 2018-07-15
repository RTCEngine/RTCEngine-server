

import * as util from 'util'
import * as Redis from 'ioredis'
import config from './config'

const redis = new Redis(config.redis.port, config.redis.host)

const streamAttributeFormat = 'stream:%s'

async function setStreamAttributes(msid: string, data: any) {
    let streamAttributeKey = util.format(streamAttributeFormat, msid)
    await redis.set(streamAttributeKey, JSON.stringify(data))
}

async function getStreamAttibutes(msid: string): Promise<any> {
    let streamAttributeKey = util.format(streamAttributeFormat, msid)
    let data = await redis.get(streamAttributeKey)
    if (data) {
        return JSON.parse(data)
    }
    return {}
}


export {
    setStreamAttributes,
    getStreamAttibutes
}
