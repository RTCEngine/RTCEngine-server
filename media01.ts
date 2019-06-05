import { config } from 'dotenv'

import MediaServer from './medianode/server'

config()

const yargs = require('yargs')


const argv = yargs.usage('Usage: ts-node $0 -p 6001 -h 127.0.0.1 -e 127.0.0.1')
    .help('help').alias('help','-h')
    .default({
        endpoint:'127.0.0.1',
        host:'127.0.0.1',
        port:6001
    })
    .options({
        endpoint: {
            alias: 'e',
            description: 'endpoint, default 127.0.0.1'
        },
        host: {
            alias: 'h',
            description: 'host, default 127.0.0.1'
        },
        port: {
            alias: 'p',
            description: 'port, default 6001'
        }
    }).argv


const port = argv.port as number
const host = argv.host as string
const endpoint = argv.endpoint as string 

const media01 = new MediaServer({
    endpoint: endpoint
})


media01.start(port, host, () => {
    console.log(`media server start on ${port}  endpoint ${endpoint}`)
})









