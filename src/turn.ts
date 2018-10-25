

import * as uuid from 'uuid'
import * as crypto from 'crypto'


import * as util from 'util'


const genRestTurn = (host:string, port:number, transports:string[], secret:string):any => {

    let urls:string[] = []
    for (let transport of transports) {
        urls.push(util.format('%s:%s:%d?transport=%s', 'turn',host,port,transport))
    }

    let timestamp = Math.round(new Date().getTime() / 1000) + 3600 * 10
    let username = timestamp + ':' + uuid.v4()
    let credential = crypto.createHmac('sha1', secret).update(username).digest().toString('base64')

    const iceServer = {
        urls:urls,
        username:username,
        credential:credential
    }

    return iceServer
}



export default {
    genRestTurn
}