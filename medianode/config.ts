
export default {
    debug: false,
    log: false,
    ultraDebug: false,
    endpoint: '127.0.0.1',
    maxMediaPort: 60000,
    minMediaPort: 40000,
    numMediaWorkers: -1,   
    capabilities: {
        audio: {
            codecs: ['opus;maxaveragebitrate=48000;maxplaybackrate=48000;stereo=1'],
            extensions: [
                'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
                'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
                'urn:ietf:params:rtp-hdrext:sdes:mid',
                'urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id',
                'urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id'
            ]
        },
        video: {
            codecs: ['h264'],
            //codecs: ['h264;packetization-mode=1;profile-level-id=42e01f'],
            rtx: true,
            rtcpfbs: [
                { 'id': 'goog-remb'},
                { 'id': 'transport-cc' },
                { 'id': 'ccm', 'params': ['fir'] },
                { 'id': 'nack' },
                { 'id': 'nack', 'params': ['pli'] }
            ],
            extensions: [
                'urn:3gpp:video-orientation',
                'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
                'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
                'http://www.webrtc.org/experiments/rtp-hdrext/playout-delay',
                'http://www.webrtc.org/experiments/rtp-hdrext/video-content-type',
                'http://www.webrtc.org/experiments/rtp-hdrext/video-timing',
                'http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07',
                
                'urn:ietf:params:rtp-hdrext:sdes:mid',
                'urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id',
                'urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id'
            ]
        }
    }
}
