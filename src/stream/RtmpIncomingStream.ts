

import IncomingStreamInterface from './IncomingStreamInterface'


class RtmpIncomingStream implements IncomingStreamInterface {

    constructor() {

    }

    getId():string {

        return ''
    }
    getStreamInfo():any {

        return
    }
    getStats():any {

        return
    }
    getTrack(trackId:string):any {

    }
    getTracks():any[] {

        return
    }
    getAudioTracks():any[]  {

        return
    }
    getVideoTracks():any[] {

        return 
    }
    stop():void  {

        return
    }
}

export default RtmpIncomingStream