import { config } from 'dotenv'

import MediaServer from './medianode/server'

config()

const port = process.env.PORT ? parseInt(process.env.PORT) : 6002
const host = process.env.HOST ? process.env.HOST : '127.0.0.1'
const endpoint = process.env.ENDPOINT ? process.env.ENDPOINT : '127.0.0.1'

const media02 = new MediaServer({
    endpoint: endpoint
})


media02.start(port, host, () => {
    console.log('media server start on', port)
})
