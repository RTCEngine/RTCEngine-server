
const CodecInfo	= require('semantic-sdp').CodecInfo

export default {
    debug: '*',
    server: {
        port: 3888,
        host: '127.0.0.1',
        secret: 'test_secret',
        externalUrl: 'http://127.0.0.1:3888/'
    },
    turnServer: {
        urls: ['turn:101.201.141.179:3478'],
        secret: 'dotEngine_turn001',
    },
    // to disable recorder  comment this
    recorder: {
        enable: true,
        refreshPeriod: 10000  // ten seconds
    },
    media: {
        debug: true,
        endpoint: '127.0.0.1',
        ultraDebug: true,
        rtcMinPort: 10000,
        rtcMaxPort: 20000,
        capabilities: {
            audio: {
                codecs: ['opus'],
                extensions: [
                    'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
                    'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01'
                ]
            },
            video: {
                codecs: ['vp8','h264;packetization-mode=1'],
                rtx:    true,
                rtcpfbs:    [
                    { 'id': 'transport-cc'},
                    { "id": "ccm", "params": ["fir"]},
                    { "id": "nack"},
                    { "id": "nack", "params": ["pli"]}
                ],
                extensions: [
                    'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
                    'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01'
                ]
            }
        }
    }
}
