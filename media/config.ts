export default {
    debug: true,
    ultraDebug: true,
    endpoint: '127.0.0.1',
    capabilities: {
        audio: {
            codecs: ['opus'],
            extensions: [
                'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
                'urn:ietf:params:rtp-hdrext:sdes:mid'
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
                'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
                'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
                'urn:ietf:params:rtp-hdrext:sdes:mid'
            ]
        }
    }
}
