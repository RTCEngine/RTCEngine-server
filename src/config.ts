export default {
    server: {
        secret: 'test_secret',
        externalUrl: 'http://127.0.0.1:3888/'
    },
    iceServers: [
    ],
    // to disable recorder  comment this
    recorder: {
        enable: false,
        refreshPeriod: 10000,  // ten seconds
        waitForIntra: false
    },
    media: {
        debug: true,
        endpoint: '127.0.0.1',
        ultraDebug: true,
        iceTransportPolicy: 'all',   // 'all' or 'relay'
        capabilities: {
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
    }
}
