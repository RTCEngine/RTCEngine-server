import {Response, Request, Router  } from 'express'

const MediaServer = require('medooze-media-server')
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

    
    const router = new MediaRouter(streamId, config.capabilities)

    const {answer} = router.createIncoming(sdp, context.endpoint)

    context.routers.set(router.getId(), router)

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

    context.routers.delete(streamId)

    // it is relay incoming stream 
    if (context.relayEndpoints.get(streamId)) {
        context.relayEndpoints.get(streamId).stop()
        context.relayEndpoints.delete(streamId)
    }

    res.json({
        s: 10000,
        d: {},
        e: ''
    })
})


apiRouter.post('/api/play', async (req: Request, res:Response) => {

    const sdp = req.body.sdp
    const streamId = req.body.streamId
    const origin = req.body.origin

    let newRelay = false
    let router = context.routers.get(streamId)

    // if we do not have this stream,  we try to pull from origin 
    if (!router) {

        const relayEndpoint = MediaServer.createEndpoint(config.endpoint)

        const relayOffer = relayEndpoint.createOffer(config.capabilities)

        const response = await fetch('http://' + origin + '/api/relay', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                streamId: streamId,
                sdp: relayOffer.toString()
            })
        })

        const ret = await response.json()
        
        const answerStr = ret.d.sdp

        router = new MediaRouter(streamId,config.capabilities)

        router.createRelayIncoming(answerStr, relayOffer.toString(), relayEndpoint)

        context.routers.set(streamId, router)

        newRelay = true

        context.relayEndpoints.set(streamId, relayEndpoint)
    }
    
    const {answer, outgoing} = router.createOutgoing(sdp, context.endpoint)

    
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

    // it is relay outgoing stream
    if (context.relayEndpoints.get(outgoingId)) {
        context.relayEndpoints.get(outgoingId).stop()
        context.relayEndpoints.delete(outgoingId)
    }

    res.json({
        s: 10000,
        d: { },
        e: ''
    })
})


apiRouter.post('/api/relay', async (req:Request, res:Response) => {

    const sdp = req.body.sdp
    const streamId = req.body.streamId

    let router = context.routers.get(streamId)


    if (!router) {
        return res.json({
            s: 10004,
            d: {},
            e: ''
        })
    }
    
    const relayEndpoint = MediaServer.createEndpoint(config.endpoint)
    const {answer, outgoing} = router.createOutgoing(sdp, relayEndpoint)

    context.relayEndpoints.set(outgoing.getId(), relayEndpoint)

    res.json({
        s: 10000,
        d: { 
            sdp: answer,
            outgoingId: outgoing.getId()
        },
        e: ''
    })

})

export default apiRouter