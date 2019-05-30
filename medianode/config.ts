
export default {
    debug: false,
    log: false,
    ultraDebug: false,
    endpoint: '127.0.0.1',
    maxMediaPort: 20000,
    minMediaPort: 10000,
    capabilities: {
        audio: {
            codecs: ['opus;maxaveragebitrate=48000;maxplaybackrate=48000;stereo=1'],
            extensions: [
                'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
                'urn:ietf:params:rtp-hdrext:sdes:mid'
            ]
        },
        video: {
            codecs: ['h264'],
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
                'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
                'urn:ietf:params:rtp-hdrext:sdes:mid'
            ]
        }
    }
}
