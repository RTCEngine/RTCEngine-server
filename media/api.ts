import {Response, Request, Router  } from 'express'
import * as cors from 'cors'

const MediaServer = require('medooze-media-server')

import MediaRouter from './router'

const apiRouter = Router()

const routers:Map<string,MediaRouter>  = new Map()

const endpoint = MediaServer.createEndpoint('127.0.0.1')


const capabilities = {
    audio: {
        codecs: ['opus'],
        rtx:true,
        rtcpfbs: [
            { "id": "nack" }
        ],
        extensions: [
            'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
            'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01'
        ]
    },
    video: {
        codecs: ['vp8'],
        //codecs: ['h264;packetization-mode=1;profile-level-id=42e01f'],
        rtx: true,
        rtcpfbs: [
            { 'id': 'goog-remb' },
            { 'id': 'transport-cc' },
            { "id": "ccm", "params": ["fir"] },
            { "id": "nack" },
            { "id": "nack", "params": ["pli"] }
        ],
        extensions: [
            "urn:3gpp:video-orientation",
            "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
            "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
            "urn:ietf:params:rtp-hdrext:toffse",
            "urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id",
            "urn:ietf:params:rtp-hdrext:sdes:mid",
        ]
    }
}

apiRouter.get('/test', async (req: Request, res: Response) => {
    res.send('hello world')
})


apiRouter.post('/api/publish', async (req: Request, res:Response) => {
    console.dir(req.body)

    const sdp = req.body.sdp

    const router = new MediaRouter(endpoint, capabilities)

    const {incoming,answer} = router.createIncoming(sdp)

    routers.set(incoming.getId(), router)

    res.json({
        s: 10000,
        d: {
            sdp: answer,
            streamId: incoming.getId()
        },
        e: ''
    })
})


apiRouter.post('/api/unpublish', async (req: Request, res:Response) => {

    const streamId = req.body.streamId

    const router = routers.get(streamId)

    router.stop()

    res.json({
        s: 10000,
        d: { },
        e: ''
    })
})


apiRouter.post('/api/play', async (req: Request, res:Response) => {

    console.dir(req.body)

    const sdp = req.body.sdp
    const streamId = req.body.streamId

    const router = routers.get(streamId)

    const {answer, outgoing} = router.createOutgoing(sdp)


    res.json({
        s: 10000,
        d: { 
            sdp: answer,
            outgoingId: outgoing.getId()
        },
        e: ''
    })
})


apiRouter.post('/api/unplay', async (req: Request, res:Response) => {

    console.dir(req.body)

    const streamId = req.body.streamId
    const outgoingId = req.body.outgoingId 

    const router = routers.get(streamId)
    router.stopOutgoing(outgoingId)

    res.json({
        s: 10000,
        d: { },
        e: ''
    })
})

apiRouter.post('/api/pull', async (req: Request, res:Response) => {

    console.dir(req.body)

    res.json({
        s: 10000,
        d: { },
        e: ''
    })
})


apiRouter.options('/api/config', cors())
apiRouter.post('/api/config', async (req: Request, res:Response) => {

    
})


export default apiRouter