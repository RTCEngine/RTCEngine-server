
const CodecInfo	= require('semantic-sdp').CodecInfo

export default {
    debug: '*',
    server: {
        port: 3888,
        host: '127.0.0.1',
        secret: 'test_secret',
        externalUrl: 'http://localhost:3888/'
    },
    turnServer: {
        urls: ['turn:101.201.141.179:3478'],
        secret: 'dotEngine_turn001',
    },
    // to disable recorder  comment this
    recorder: {
        refreshPeriod: 10000  // ten seconds
    },
    media: {
        debug: true,
        ultraDebug: true,
        rtcMinPort: 10000,
        rtcMaxPort: 20000,
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
                ])
            }
        }
    }
}
