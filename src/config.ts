export default {

    server: {
        secret: 'test_secret',
        externalUrl: 'http://192.168.200.15:3888/'
    },
    iceServer: {
        urls: ['101.201.141.179:3478', '101.201.141.179:3478'],
        secret: 'dotEngine_turn001',
        transports: ['udp', 'tcp']

    },

    iceServers: [
        {
            host: '101.201.141.179',
            port: 3478,
            secret: 'dotEngine_turn001',
            transports: ['udp', 'tcp']
        }
    ],
    // to disable recorder  comment this
    recorder: {
        enable: true,
        refreshPeriod: 10000,  // ten seconds
        waitForIntra: false
    },
    media: {
        debug: true,
        endpoint: '192.168.200.15',
        ultraDebug: true,
        rtcMinPort: 10000,
        rtcMaxPort: 10002,
        iceTransportPolicy: 'all',   // 'all' or 'relay'
        capabilities: {
            audio: {
                codecs: ['opus'],
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
                    { 'id': 'transport-cc' },
                    { "id": "ccm", "params": ["fir"] },
                    { "id": "nack" },
                    { "id": "nack", "params": ["pli"] }
                ],
                extensions: [
                    'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
                    'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01'
                ]
            }
        }
    }
}
