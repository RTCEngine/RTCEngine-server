


const randomstring = require('randomstring')

class Message {
    id:string
    peer:string
    room:string
    type:string
    data:any

    toJSON():any
    {
        return {
            id: this.id,
            peer: this.peer,
            room: this.room,
            type: this.type,
            data: this.data
        }
    }

    static parse(raw: string): Message {
        let message:Message = new Message()
        let object = JSON.parse(raw)
        message.id = object.id
        message.peer = object.peer
        message.room = object.room
        message.type = object.type
        message.data = object.data || {}
        return message
    }

    static messageFactory(params:any): Message {
            
        let message = new Message()
        message.id = params.id ? params.id : randomstring.generate(10)
        message.peer = params.peer
        message.room = params.room
        message.type = params.type
        message.data = params.data || {}

        return message
    }
}

export default Message


