import { config } from 'dotenv'

import MediaServer from './medianode/server'

config()

const port = 6001
const host = process.env.HOST ? process.env.HOST : '127.0.0.1'
const endpoint = process.env.ENDPOINT ? process.env.ENDPOINT : '127.0.0.1'

const media01 = new MediaServer({
    endpoint: endpoint
})


media01.start(port, host, () => {
    console.log(`media server start on ${port}  endpoint ${endpoint}`)
})









