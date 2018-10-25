

import * as uuid from 'uuid'
import * as crypto from 'crypto'


import * as util from 'util'


const genRestTurn = (urls: string[], transports:string[], secret:string): any[] => {

    let iceServers = []

    let uris = []
    for (let i = 0; i < urls.length; i++) {
        let url = urls[i]
        for (let j=0; j < transports.length; j++) {
            let transport = transports[j]
            uris.push(util.format('%s:%s?transport=%s', 'turn',url,transport))
        }
    }

    let timestamp = Math.round(new Date().getTime() / 1000) + 3600 * 24
    let username = timestamp + ':' + uuid.v4()
    let credential = crypto.createHmac('sha1', secret).update(username).digest().toString('base64')

    const iceServer = {
        urls : uris,
        username : username,
        credential : credential
    }
    iceServers.push(iceServer)
    return iceServers
}


export default {
    genRestTurn
}