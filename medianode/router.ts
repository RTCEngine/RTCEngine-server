import { EventEmitter } from 'events'

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
    private incoming: any
    private outgoings: Map<string,any> = new Map()
    private endpoint:any
    private relay: boolean = false


    constructor(id:string,endpoint:any,capabilities:any) {
        super()
        this.routerId = id
        this.endpoint = endpoint
        this.capabilities = capabilities
    }

    public getId() {
        return this.routerId
    }

    public isRelay():boolean {
        return this.relay
    }

    /**
     * @returns {*}
     * @memberof Router
     */
    public getIncoming(): any {
        return this.incoming
    }


    public setIncoming(incoming:any) {
        this.incoming = incoming
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


    public createRelayIncoming(remoteSdp:string, localSdp:string) {

        const remote = SDPInfo.process(remoteSdp)
        const local = SDPInfo.process(localSdp)

        this.relay = true

        const transport = this.endpoint.createTransport(remote, local, {disableSTUNKeepAlive: true})
        transport.setLocalProperties(local)
        transport.setRemoteProperties(remote)

        const streamInfo = remote.getFirstStream()
        const incoming = transport.createIncomingStream(streamInfo)

        incoming.assoTransport = transport
        this.incoming = incoming

        return {
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
        transport.setRemoteProperties(offer)

        const answer = offer.answer({
            dtls: transport.getLocalDTLSInfo(),
            ice: transport.getLocalICEInfo(),
            candidates: this.endpoint.getLocalCandidates(),
            capabilities: this.capabilities
        })
        transport.setLocalProperties(answer)

        const outgoing = transport.createOutgoingStream({
			audio: true,
			video: true
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

        this.endpoint.stop()

        this.outgoings = null
        this.incoming = null
        
        this.endpoint = null
    }
}


export default MediaRouter