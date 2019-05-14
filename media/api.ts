import {Response, Request, Router  } from 'express'


const SemanticSDP = require('semantic-sdp')
const SDPInfo		= SemanticSDP.SDPInfo

import MediaRouter from './router'

import config from './config'
import context from './context'
import fetch from 'node-fetch'

const apiRouter = Router()



apiRouter.get('/test', async (req: Request, res: Response) => {
    res.send('hello world')
})



apiRouter.post('/api/publish', async (req: Request, res:Response) => {

    const sdp = req.body.sdp
    const streamId = req.body.streamId

    
    const router = new MediaRouter(streamId, context.endpoint, config.capabilities)

    const {answer} = router.createIncoming(sdp)

    context.routers.set(router.getId(), router)


    console.log('publish', streamId)
    console.log('publish', sdp)
    

    res.json({
        s: 10000,
        d: {
            sdp: answer,
            streamId: router.getId()
        },
        e: ''
    })
})


apiRouter.post('/api/unpublish', async (req: Request, res:Response) => {

    const streamId = req.body.streamId

    const router = context.routers.get(streamId)

    if (!router) {
        res.json({
            s: 10004,  // does not exit
            d: {},
            e: '',
        })
        return
    }

    router.stop()

    res.json({
        s: 10000,
        d: {},
        e: ''
    })
})


apiRouter.post('/api/play', async (req: Request, res:Response) => {

    console.dir(req.body)

    const sdp = req.body.sdp
    const streamId = req.body.streamId
    const origin = req.body.origin

    let newRelay = false
    let router = context.routers.get(streamId)

    // if we do not have this stream,  we try to pull from origin 
    if (!router) {

        const relayOffer = context.endpoint.createOffer(config.capabilities)

        const response = await fetch('http://' + origin + '/api/play', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                streamId: streamId,
                sdp: relayOffer.toString()
            })
        })
    
        const ret = await response.json()

        const relayAnswer = SDPInfo.process(ret.d.sdp)

        const relayTransport = context.endpoint.createTransport(relayAnswer, relayOffer, {disableSTUNKeepAlive: true})
        relayTransport.setLocalProperties(relayOffer)
        relayTransport.setRemoteProperties(relayAnswer)

        const relayStreamInfo = relayAnswer.getFirstStream()

        const relayIncomingStream = relayTransport.createIncomingStream(relayStreamInfo)

        relayIncomingStream.on('stopped', () => {
            // delete from routers
        })

        router = new MediaRouter(streamId, context.endpoint, config.capabilities)

        relayIncomingStream.assoTransport = relayTransport 

        router.setIncoming(relayIncomingStream)
        context.routers.set(streamId, router)

        newRelay = true
    }
    
    const {answer, outgoing} = router.createOutgoing(sdp)
    
    res.json({
        s: 10000,
        d: { 
            sdp: answer,
            newRelay: newRelay,
            outgoingId: outgoing.getId()
        },
        e: ''
    })
})


apiRouter.post('/api/unplay', async (req: Request, res:Response) => {

    console.dir(req.body)

    const streamId = req.body.streamId
    const outgoingId = req.body.outgoingId 

    const router = context.routers.get(streamId)

    if (!router) {
        res.json({
            s: 10000,
            d: { },
            e: ''
        })
        return  
    }

    router.stopOutgoing(outgoingId)

    res.json({
        s: 10000,
        d: { },
        e: ''
    })
})


apiRouter.get('/api/offer', async (req: Request, res:Response) => {
    const remoteOffer = context.endpoint.createOffer(config.capabilities)
    
    res.json({
        s: 10000,
        d: {
            sdp: remoteOffer.toString()
        },
        e: ''
    })
})



apiRouter.post('/api/pull', async (req:Request, res:Response) => {

    
    const origin = req.body.origin
    const streamId = req.body.streamId 

    const offer = context.endpoint.createOffer(config.capabilities)

    const response = await fetch('http://' + origin + '/api/play', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            streamId: streamId,
            sdp: offer.toString()
        })
    })

    const ret = await response.json()

    const { sdp } = ret.d 

    const answer  = SDPInfo.process(sdp)

    const transport = context.endpoint.createTransport(answer, offer, {disableSTUNKeepAlive:true})

    transport.setLocalProperties(offer)
    transport.setRemoteProperties(answer)

    const streamInfo = answer.getFirstStream()
    const incoming = transport.createIncomingStream(streamInfo)

    console.error('relay================')
    console.dir(streamInfo)

    console.error('relay================')
    console.dir(incoming)

    const router = new MediaRouter(streamId, context.endpoint, config.capabilities)

    incoming.assoTransport = transport 
    
    router.setIncoming(incoming)

    context.routers.set(streamId, router)

    res.json({
        s: 10000,
        d: {},
        e: ''
    })

})

export default apiRouter