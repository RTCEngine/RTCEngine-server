

import fetch from 'node-fetch'

const ip = require('ip')

const MediaServer = require('medooze-media-server')
const SemanticSDP = require('semantic-sdp')
const SDPInfo = SemanticSDP.SDPInfo

const yargs = require('yargs')

const localhost = ip.address()

MediaServer.enableDebug(true)
MediaServer.enableUltraDebug(true)

const argv = yargs
    .usage('Usage: ts-node $0 -s streamname -e 127.0.0.1 -m 127.0.0.1:6000')
    .help('help').alias('help','h')
    .default({
        medianode:'127.0.0.1:6000',
        endpoint: localhost,
        count: 200
    })
    .options({
        medianode: {
            alias: 'm',
            description: 'medianode to use, default 127.0.0.1:6000',
            requiresArg: true,
        },
        endpoint: {
            alias: 'e',
            description: 'endpoint to use, default 127.0.0.1',
            requiresArg: true,
        },
        stream: {
            alias: 's',
            description: 'stream to subscribe',
            requiresArg: true,
            required: true 
        },
        count: {
            alias: 'c',
            description: 'stream count to bench',
            requiresArg: true
        }
    }).argv



const capabilities = {
    audio: {
        codecs: ['opus'],
        extensions: [
            'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
            'urn:ietf:params:rtp-hdrext:sdes:mid'
        ]
    },
    video: {
        codecs: ['h264'],
        rtx: true,
        rtcpfbs: [
            { 'id': 'transport-cc' },
            { "id": "ccm", "params": ["fir"] },
            { "id": "nack" },
            { "id": "nack", "params": ["pli"] }
        ],
        extensions: [
            'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
            'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
            'urn:ietf:params:rtp-hdrext:sdes:mid'
        ]
    }
}

const startBench = async (streamId:string, endpoint:string, medianode:string, count:number) => {

    const benchEndpoints = new Map<number,boolean>()

    for (let i=1; i <= count; i++) {

        const relayEndpoint = MediaServer.createEndpoint(endpoint)

        const relayOffer = relayEndpoint.createOffer(capabilities)
    
        const response = await fetch('http://' + medianode + '/api/play', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                streamId: streamId,
                sdp: relayOffer.toString()
            })
        })
    
        const ret = await response.json()
    
        const answerStr = ret.d.sdp
    
        const relayAnswer = SDPInfo.process(answerStr)
        
        const relayTransport = relayEndpoint.createTransport(relayAnswer, relayOffer, {disableSTUNKeepAlive: true})
    
        relayTransport.on('dtlsstate', (state) => {
            
            if (state === 'connected') {
                benchEndpoints.set(i,true)
                let connected = benchEndpoints.size
                console.log(`transport ${i} connect,  ${connected} connected`)
            }
        })
    
        relayTransport.setLocalProperties(relayOffer)
        relayTransport.setRemoteProperties(relayAnswer)
    
        const streamInfo = relayAnswer.getFirstStream()
        const incoming = relayTransport.createIncomingStream(streamInfo)
    }
}

if (argv.stream && argv.endpoint && argv.medianode) {

    startBench(argv.stream, argv.endpoint, argv.medianode, argv.count)
}



