import { EventEmitter } from 'events'

import * as uuid from 'uuid'

const MediaServer = require('medooze-media-server')
const SemanticSDP = require('semantic-sdp')

const SDPInfo = SemanticSDP.SDPInfo
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


    constructor(id:string, endpoint:any, capabilities:any) {
        super()
        this.routerId = id
        this.endpoint = endpoint
        this.capabilities = capabilities
    }

    public getId() {
        return this.routerId
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
        transport.setRemoteProperties(offer)

        const answer = offer.answer({
            dtls: transport.getLocalDTLSInfo(),
            ice: transport.getLocalICEInfo(),
            candidates: this.endpoint.getLocalCandidates(),
            capabilities: this.capabilities
        })
        transport.setLocalProperties(answer)
        const streamInfo = offer.getFirstStream()
        const incoming = transport.createIncomingStream(streamInfo)
        incoming.assoTransport = transport 
        this.incoming = incoming

        return {
            answer: answer.toString(),
            incoming: incoming
        }
    }

    
    public setIncoming(incoming:any) {
        this.incoming = incoming
    }


    /**
     * @param {string} sdp
     * @returns
     * @memberof Router
     */
    public createOutgoing(sdp:string, outgoingId?:string) {

        const offer = SDPInfo.process(sdp)
        const transport = this.endpoint.createTransport(offer)
        transport.setRemoteProperties(offer)

        const answer = offer.answer({
            dtls: transport.getLocalDTLSInfo(),
            ice: transport.getLocalICEInfo(),
            candidates: this.endpoint.getLocalCandidates(),
            capabilities: this.capabilities
        })
        transport.setLocalProperties(answer)

        const outgoing = transport.createOutgoingStream({
            id: outgoingId,
			audio: this.incoming.getAudioTracks().length,
			video: this.incoming.getVideoTracks().length
        })

        outgoing.attachTo(this.incoming)
        
        outgoing.assoTransport = transport
        this.outgoings.set(outgoing.getId(), outgoing)
        answer.addStream(outgoing.getStreamInfo())

        return {
            answer: answer.toString(),
            outgoing: outgoing
        }
    }

    public stopOutgoing(streamId:string) {

        const outgoing = this.outgoings.get(streamId)

        if (outgoing && outgoing.assoTransport) {
            outgoing.assoTransport.stop()
        }

        this.outgoings.delete(streamId)
    }

    public stop() {

        if (this.incoming) {
            this.incoming.assoTransport.stop()
        }
        
        for (let outgoing of this.outgoings.values()) {
            if(outgoing.assoTransport) {
                outgoing.assoTransport.stop()
            }
        }
        this.outgoings = null
        this.incoming = null
       
    }
}


export default MediaRouter