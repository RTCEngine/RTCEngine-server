
const CodecInfo	= require('semantic-sdp').CodecInfo


export default {
    debug: '*',
    server: {
        port: 3888,
        host: '127.0.0.1',
        secret: 'dotEngine_secret',
        externalUrl: 'ws://localhost:3888/ws'
    },
    redis: {
        port: 6379,
        host: '127.0.0.1'
    },
    recorder:
        {
            enable: false,
            host: '127.0.0.1',
            recorddir: './'
        },
    turnServer: {
        urls: ['turn:101.201.141.179:3478'],
        secret: 'dotEngine_turn001',
    },
    audioLevel: {
        enable: true,
        minAudioLevel: 10
    },
    media: {
        debug: true,
        ultraDebug: true,
        rtcMinPort: 30000,
        rtcMaxPort: 49999,
        capabilities: {
            audio: {
                codecs: CodecInfo.MapFromNames(['opus']),
                extensions: new Set([
                    'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
                    'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01'
                ])
            },
            video: {
                codecs: CodecInfo.MapFromNames(['vp8', 'flexfec-03'], true),
                extensions: new Set([
                    'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
                    'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
                    'urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id',
                    'urn:ietf:params:rtp-hdrext:sdes:repair-rtp-stream-id',
                    'urn:ietf:params:rtp-hdrext:sdes:mid'
                ]),
                simulcast: true
            }
        }
    }
}
