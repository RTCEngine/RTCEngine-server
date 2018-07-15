

import * as uuid from 'uuid'
import * as crypto from 'crypto'

import config from './config'

const secret = config.turnServer.secret

const genRestTurn = (turnUrls: string[]): any[] => {

    let iceServers = []
    for (let i = 0; i < turnUrls.length; i++) {
        let turnUrl = turnUrls[i]
        let timestamp = Math.round(new Date().getTime() / 1000) + 3600 * 24
        let username = timestamp + ':' + uuid.v4()
        let credential = crypto.createHmac('sha1', secret).update(username).digest().toString('base64')
        
        const url = {
            url: turnUrl,
            username: username,
            credential: credential
        }

        iceServers.push(url)
    }
    return iceServers
}

export {
    genRestTurn
}