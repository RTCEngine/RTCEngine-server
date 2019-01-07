import { EventEmitter } from 'events'

import * as uuid from 'uuid'

const MediaServer = require('medooze-media-server')
const SemanticSDP = require('semantic-sdp')

const SDPInfo = SemanticSDP.SDPInfo
const MediaInfo = SemanticSDP.MediaInfo
const CandidateInfo = SemanticSDP.CandidateInfo
const DTLSInfo = SemanticSDP.DTLSInfo
const ICEInfo = SemanticSDP.ICEInfo
const StreamInfo = SemanticSDP.StreamInfo
const TrackInfo = SemanticSDP.TrackInfo
const Direction = SemanticSDP.Direction
const CodecInfo = SemanticSDP.CodecInfo

/**
 *
 *
 * @class Router
 * @extends {EventEmitter}
 */
class MediaRouter extends EventEmitter {

    private routerId: string
    private capabilities: any
    private endpoint: any
    private incoming: any
    private outgoings: Map<string,any> = new Map()


    constructor(endpoint:any,capabilities:any) {
        super()
        this.routerId = uuid.v4()
        this.endpoint = endpoint
        this.capabilities = capabilities
    }

    /**
     * @returns {*}
     * @memberof Router
     */
    public getIncoming(): any {
        return this.incoming
    }


    /**
     * @param {string} sdp
     * @returns
     * @memberof Router
     */
    public createIncoming(sdp:string) {
        
        const offer = SDPInfo.process(sdp)
        const transport = this.endpoint.createTransport(offer)
        const answer = offer.answer({
            dtls: transport.getLocalDTLSInfo(),
            ice: transport.getLocalICEInfo(),
            candidates: this.endpoint.getLocalCandidates(),
            capabilities: this.capabilities
        })
        transport.setLocalProperties(answer)
        const streamInfo = offer.getFirstStream()
        const incoming = transport.createIncomingStream(streamInfo)
        incoming.transport = transport 
        this.incoming = incoming

        return {
            answer: answer.toString(),
            incoming: incoming
        }
    }


    /**
     * @param {string} sdp
     * @returns
     * @memberof Router
     */
    public createOutgoing(sdp:string) {

        const offer = SDPInfo.process(sdp)
        const transport = this.endpoint.createTransport(offer)
        const answer = offer.answer({
            dtls: transport.getLocalDTLSInfo(),
            ice: transport.getLocalICEInfo(),
            candidates: this.endpoint.getLocalCandidates(),
            capabilities: this.capabilities
        })
        const outgoing = transport.publish(this.incoming)
        outgoing.transport = transport
        this.outgoings.set(outgoing.getId(), outgoing)
        answer.addStream(outgoing.getStreamInfo())

        return {
            answer: answer.toString(),
            outgoing: outgoing
        }
    }

    public stopOutgoing(streamId:string) {

        const outgoing = this.outgoings.get(streamId)

        if (outgoing.transport) {
            outgoing.transport.stop()
        }

        this.outgoings.delete(streamId)
        
    }

    public stop() {

        if (this.incoming) {
            this.incoming.transport.stop()
        }

        for (let outgoing of this.outgoings.values()) {
            if(outgoing.transport) {
                outgoing.transport.stop()
            }
        }

        this.incoming = null
        this.outgoings = null
    }
}


export default MediaRouter