


const randomstring = require('randomstring')

class Message {
    id:string
    type:string
    data:any

    toJSON():any
    {
        return {
            id: this.id,
            type: this.type,
            data: this.data
        }
    }

    static parse(raw: string): Message {
        let message:Message = new Message()
        let object = JSON.parse(raw)
        message.id = object.id
        message.type = object.type
        message.data = object.data || {}
        return message
    }

    static messageFactory(params:any): Message {
            
        let message = new Message()
        message.id = params.id ? params.id : randomstring.generate(10)
        message.type = params.type
        message.data = params.data || {}

        return message
    }
}

export default Message


