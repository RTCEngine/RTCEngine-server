import * as dotenv from 'dotenv'


import MediaServer from './medianode/server'

const media02 = new MediaServer({
    endpoint: '127.0.0.1'
})

const port = process.env.PORT ? parseInt(process.env.PORT) : 6002
const host = process.env.HOST ? process.env.HOST : '127.0.0.1'

media02.start(port, host, () => {
    console.log('media server start on', port)
})
