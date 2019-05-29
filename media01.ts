import * as dotenv from 'dotenv'

import MediaServer from './medianode/server'

const media01 = new MediaServer({
    endpoint: '127.0.0.1'
})

const port = process.env.PORT ? parseInt(process.env.PORT) : 6001
const host = process.env.HOST ? process.env.HOST : '127.0.0.1'

media01.start(port, host, () => {
    console.log('media server start on', 6001)
})









