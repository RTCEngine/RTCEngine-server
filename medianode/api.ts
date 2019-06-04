import {Response, Request, Router  } from 'express'

const MediaServer = require('medooze-media-server')
const SemanticSDP = require('semantic-sdp')

import fetch from 'node-fetch'

import MediaRouter from './router'
import config from './config'
import context from './context'

import logger from '../lib/logger'


const apiRouter = Router()


apiRouter.get('/test', async (req: Request, res: Response) => {
    res.send('hello world')
})


apiRouter.post('/api/publish', async (req: Request, res:Response) => {

    const {sdp,streamId} = req.body

    logger.info(`publish ${streamId}`)
    
    const router = new MediaRouter(streamId, config.capabilities)

    const endpoint = context.getEndpoint(streamId)

    const {answer} = router.createIncoming(sdp, endpoint)

    context.addRouter(router.getId(), router)

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

    const {streamId} = req.body

    logger.info(`unpublish ${streamId}`)

    const router = context.getRouter(streamId)

    if (!router) {
        res.json({
            s: 10004,  // does not exit
            d: {},
            e: '',
        })
        return
    }

    router.stop()

    context.removeRouter(streamId)
    context.removeStreamEndpoint(streamId)

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

    const {sdp,streamId,origin} = req.body

    logger.info(`play stream ${streamId} origin ${origin}`)

    let newRelay = false
    let router = context.getRouter(streamId)

    // if we do not have this stream,  we try to pull from origin 
    if (!router) {

        logger.info(`relay stream ${streamId} from origin ${origin}`)

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

        context.addRouter(streamId, router)

        newRelay = true

        context.relayEndpoints.set(streamId, relayEndpoint)
    }

    const endpoint = context.getEndpoint(streamId)
    const {answer, outgoing} = router.createOutgoing(sdp, endpoint)

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

    const {streamId,outgoingId} = req.body

    logger.info(`unplay streamId ${streamId}  outgoingId ${outgoingId}`)

    const router = context.getRouter(streamId)

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

    const {sdp,streamId} = req.body

    let router = context.getRouter(streamId)

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


// TODO unrelay

export default apiRouter