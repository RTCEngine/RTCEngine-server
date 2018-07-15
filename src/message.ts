

export default class Message {

    static parse(raw: string): any {
        let message: any = {}

        let object = JSON.parse(raw)

        message.id = object.id
        message.type = object.type
        message.from = object.from
        message.target = object.target
        message.data = object.data || {}
        return message
    }
}


