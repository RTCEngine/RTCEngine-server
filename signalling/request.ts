
import fetch from 'node-fetch'

import logger from '../lib/logger'


const publish = async (node:string ,publishId: string, offer: string, data?:any): Promise<{code:number, data?:any}> => {

    let ret
    try {
        let res = await fetch('http://'+ node + '/api/publish', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sdp: offer,
                streamId: publishId,
                data: data 
            })
        })

        ret = await res.json()        
    } catch (error) {
        logger.error(`publish stream error node:${node} publisherId:${publishId} offer:${offer}`, error)
        return {code:10004}
    }

    const { sdp,streamId } = ret.d 

    return {
        code: 10000,
        data: {
            sdp,
            streamId
        }
    }
}


const unpublish = async (node:string ,streamId: string): Promise<{code:number, data?:any}> => {

    let ret 
    try {
        let res = await fetch('http://'+ node  + '/api/unpublish', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                streamId: streamId
            })
        })

        ret = await res.json()
    } catch (error) {
        logger.error(`unpublish stream error  node:${node} publisherId:${streamId}`)
        return {code:10004}
    }

    return {
        code: ret.s,
        data: ret.d
    }
  
}


const play = async (origin:string,node:string, streamId: string, sdp: string): Promise<{code:number, data?:any}> => {

    let ret
    try {
        let res = await fetch('http://'+ node  + '/api/play', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origin: origin,
                streamId: streamId,
                sdp: sdp
            })
        })

        ret = await res.json()
    } catch (error) {
        logger.error(`play stream error origin:${origin} node:${node} publisherId:${streamId}  sdp:${sdp}`, error)
        return {code:10004}
    }

    return {
        code: ret.s,
        data: ret.d
    }

}


const unplay = async (node:string,streamId: string, outgoingId:string): Promise<{code:number, data?:any}> => {

    let ret 
    try {
        let res = await fetch('http://'+ node  + '/api/unplay', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                streamId: streamId,
                outgoingId: outgoingId
            })
        })

        ret = await res.json()
    } catch (error) {
        logger.error(`unplay stream error  node:${node} publisherId:${streamId} outgoingId:${outgoingId}`)
        return {code:10004}
    }


    return {
        code: ret.s,
        data: ret.d
    }
}


export default {
    publish,
    unpublish,
    play,
    unplay
}