
import fetch from 'node-fetch'


const publish = async (node:string ,streamId: string, sdp: string, data?:any) => {

    let res = await fetch('http://'+ node + '/api/publish', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sdp: sdp,
            streamId: streamId,
            data: data 
        })
    })
    
    let ret = await res.json()
    return ret.d
}



const unpublish = async (node:string ,streamId: string) => {

    // streamId
    let res = await fetch('http://'+ node  + '/api/unpublish', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            streamId: streamId
        })
    })

    let ret = await res.json()
    return ret.d
}


const play = async (origin:string,node:string, streamId: string, sdp: string) => {

    let res = await fetch('http://'+ node  + '/api/play', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            origin: origin,
            streamId: streamId,
            sdp: sdp
        })
    })

    
    let ret = await res.json()
    return ret.d
    
}


const unplay = async (node:string,streamId: string, outgoingId:string) => {


    let res = await fetch('http://'+ node  + '/api/unplay', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            streamId: streamId,
            outgoingId: outgoingId
        })
    })

    let ret = await res.json()
    return ret.d
}


const pull = async (origin:string, node:string, streamId:string) => {

    let res = await fetch('http://' + node + '/api/pull', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            origin: origin,
            streamId: streamId
        })
    })

    let ret = await res.json()
    console.dir(ret)
    return ret.d
}



export default {
    publish,
    unpublish,
    play,
    unplay,
    pull
}