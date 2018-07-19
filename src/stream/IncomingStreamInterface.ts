


interface IncomingStreamInterface {
    getId():string
    getStreamInfo():any
    getStats():any
    getTrack(string):any
    getTracks():any[]
    getAudioTracks():any[]
    getVideoTracks():any[]
    stop():void
}

export default IncomingStreamInterface